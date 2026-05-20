from sqlalchemy import text


def get_return_summary_service(db):
    row = db.execute(text("""
        SELECT
            COUNT(i.iade_id) AS toplam_iade_sayisi,
            (SELECT COUNT(*) FROM faturalar WHERE belge_tipi_id = 1) AS toplam_satis_sayisi,
            COALESCE(SUM(i.iade_tutari), 0) AS toplam_iade_tutari
        FROM iadeler i
    """)).fetchone()

    top_product = db.execute(text("""
        SELECT
            COALESCE(u.urun_adi, 'Ürün bilgisi yok') AS urun_adi,
            COUNT(i.iade_id) AS iade_sayisi
        FROM iadeler i
        LEFT JOIN faturalar f ON i.fatura_no = f.fatura_no
        LEFT JOIN siparis_detaylari sd ON f.fatura_no = sd.fatura_no
        LEFT JOIN urunler u ON sd.urun_id = u.urun_id
        GROUP BY COALESCE(u.urun_adi, 'Ürün bilgisi yok')
        ORDER BY iade_sayisi DESC
        LIMIT 1
    """)).fetchone()

    toplam_iade = int(row[0] or 0)
    toplam_satis = int(row[1] or 0)
    toplam_iade_tutari = float(row[2] or 0)

    iade_orani = round((toplam_iade / toplam_satis) * 100, 1) if toplam_satis else 0

    return {
        "toplam_iade_sayisi": toplam_iade,
        "iade_orani": iade_orani,
        "toplam_iade_tutari": toplam_iade_tutari,
        "en_cok_iade_edilen_urun": top_product[0] if top_product else "-",
        "en_cok_iade_edilen_urun_sayisi": int(top_product[1] or 0) if top_product else 0
    }


def get_all_returns_service(db, limit: int = 100, offset: int = 0):
    total_count = db.execute(text("SELECT COUNT(*) FROM iadeler")).scalar()

    rows = db.execute(text("""
        SELECT
            i.iade_id,
            i.fatura_no,
            CONCAT(m.musteri_adi, ' ', COALESCE(m.musteri_soyadi, '')) AS musteri,
            COALESCE(GROUP_CONCAT(DISTINCT u.urun_adi SEPARATOR ', '), 'Ürün bilgisi yok') AS urunler,
            i.iade_tutari,
            i.iade_tarihi,
            sn.satis_noktasi_adi,
            i.aciklama,
            COALESCE(SUM(sd.adet), 0) AS iade_adedi
        FROM iadeler i
        LEFT JOIN faturalar f ON i.fatura_no = f.fatura_no
        LEFT JOIN musteriler m ON f.musteri_id = m.musteri_id
        LEFT JOIN satis_noktalari sn ON f.satis_noktasi_id = sn.satis_noktasi_id
        LEFT JOIN siparis_detaylari sd ON f.fatura_no = sd.fatura_no
        LEFT JOIN urunler u ON sd.urun_id = u.urun_id
        GROUP BY
            i.iade_id,
            i.fatura_no,
            m.musteri_adi,
            m.musteri_soyadi,
            i.iade_tutari,
            i.iade_tarihi,
            sn.satis_noktasi_adi,
            i.aciklama
        ORDER BY i.iade_tarihi DESC
        LIMIT :limit OFFSET :offset
    """), {"limit": limit, "offset": offset}).fetchall()

    return {
        "toplam_kayit": int(total_count or 0),
        "limit": int(limit),
        "offset": int(offset),
        "veriler": [
            {
                "iade_id": int(row[0] or 0),
                "iade_no": f"IADE-{row[0]}",
                "fatura_no": row[1],
                "musteri": row[2].strip() if row[2] else "-",
                "urun": row[3] or "Ürün bilgisi yok",
                "iade_tutari": float(row[4] or 0),
                "tarih": str(row[5]) if row[5] else "-",
                "satis_noktasi": row[6] or "-",
                "aciklama": row[7] or "-",
                "iade_adedi": int(row[8] or 0)
            }
            for row in rows
        ]
    }


def get_return_monthly_trend_service(db, year: int, satis_noktasi: str = "all"):
    where_point = ""
    params = {"year": year}

    if satis_noktasi and satis_noktasi != "all":
        where_point = "AND sn.satis_noktasi_adi = :satis_noktasi"
        params["satis_noktasi"] = satis_noktasi

    rows = db.execute(text(f"""
        SELECT
            MONTH(i.iade_tarihi) AS ay,
            COUNT(i.iade_id) AS iade_sayisi,
            COALESCE(SUM(i.iade_tutari), 0) AS iade_tutari
        FROM iadeler i
        LEFT JOIN faturalar f ON i.fatura_no = f.fatura_no
        LEFT JOIN satis_noktalari sn ON f.satis_noktasi_id = sn.satis_noktasi_id
        WHERE YEAR(i.iade_tarihi) = :year
        {where_point}
        GROUP BY MONTH(i.iade_tarihi)
        ORDER BY ay
    """), params).fetchall()

    months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]

    data = {
        int(row[0]): {
            "iade_sayisi": int(row[1] or 0),
            "iade_tutari": float(row[2] or 0)
        }
        for row in rows
    }

    return [
        {
            "ay_no": i,
            "ay": month,
            "iade_sayisi": data.get(i, {}).get("iade_sayisi", 0),
            "iade_tutari": data.get(i, {}).get("iade_tutari", 0)
        }
        for i, month in enumerate(months, start=1)
    ]


def get_return_product_analysis_service(db):
    rows = db.execute(text("""
        SELECT
            COALESCE(u.urun_adi, 'Ürün bilgisi yok') AS urun_adi,
            COUNT(DISTINCT i.iade_id) AS iade_sayisi,
            COALESCE(SUM(sd.adet), 0) AS toplam_iade_adedi,
            COALESCE(SUM(sd.satir_toplami), 0) AS toplam_iade_tutari
        FROM iadeler i
        LEFT JOIN faturalar f ON i.fatura_no = f.fatura_no
        LEFT JOIN siparis_detaylari sd ON f.fatura_no = sd.fatura_no
        LEFT JOIN urunler u ON sd.urun_id = u.urun_id
        GROUP BY COALESCE(u.urun_adi, 'Ürün bilgisi yok')
        ORDER BY iade_sayisi DESC
        LIMIT 10
    """)).fetchall()

    return [
        {
            "urun": row[0],
            "iade_sayisi": int(row[1] or 0),
            "toplam_iade_adedi": int(row[2] or 0),
            "toplam_iade_tutari": float(row[3] or 0)
        }
        for row in rows
    ]


def get_return_point_analysis_service(db):
    rows = db.execute(text("""
        SELECT
            sn.satis_noktasi_adi,
            COUNT(i.iade_id) AS iade_sayisi,
            COALESCE(SUM(i.iade_tutari), 0) AS toplam_iade_tutari
        FROM iadeler i
        LEFT JOIN faturalar f ON i.fatura_no = f.fatura_no
        LEFT JOIN satis_noktalari sn ON f.satis_noktasi_id = sn.satis_noktasi_id
        GROUP BY sn.satis_noktasi_id, sn.satis_noktasi_adi
        ORDER BY iade_sayisi DESC
    """)).fetchall()

    return [
        {
            "satis_noktasi": row[0] or "-",
            "iade_sayisi": int(row[1] or 0),
            "toplam_iade_tutari": float(row[2] or 0)
        }
        for row in rows
    ]

