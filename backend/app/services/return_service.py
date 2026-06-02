from sqlalchemy import text


def get_return_risk_level(count: int):
    if count >= 5:
        return "Yüksek"
    if count >= 2:
        return "Orta"
    return "Düşük"


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


def get_all_returns_service(
    db,
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    satis_noktasi: str | None = None,
    risk: str | None = None,
    year: int | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    min_tutar: float | None = None,
    max_tutar: float | None = None
):
    where = ["1=1"]
    params = {}

    if search:
        where.append("""
            (
                CAST(i.iade_id AS CHAR) LIKE :search
                OR CAST(i.fatura_no AS CHAR) LIKE :search
                OR CONCAT(COALESCE(m.musteri_adi, ''), ' ', COALESCE(m.musteri_soyadi, '')) LIKE :search
                OR COALESCE(u.urun_adi, '') LIKE :search
                OR COALESCE(u.urun_kodu, '') LIKE :search
                OR COALESCE(sn.satis_noktasi_adi, '') LIKE :search
                OR COALESCE(i.aciklama, '') LIKE :search
            )
        """)
        params["search"] = f"%{search}%"

    if satis_noktasi and satis_noktasi != "all":
        where.append("COALESCE(sn.satis_noktasi_adi, '-') = :satis_noktasi")
        params["satis_noktasi"] = satis_noktasi

    if year:
        where.append("YEAR(i.iade_tarihi) = :year")
        params["year"] = year

    if start_date:
        where.append("DATE(i.iade_tarihi) >= :start_date")
        params["start_date"] = start_date

    if end_date:
        where.append("DATE(i.iade_tarihi) <= :end_date")
        params["end_date"] = end_date

    if min_tutar is not None:
        where.append("i.iade_tutari >= :min_tutar")
        params["min_tutar"] = min_tutar

    if max_tutar is not None:
        where.append("i.iade_tutari <= :max_tutar")
        params["max_tutar"] = max_tutar

    where_sql = " AND ".join(where)

    rows = db.execute(text(f"""
        SELECT
            i.iade_id,
            i.fatura_no,
            CONCAT(COALESCE(m.musteri_adi, ''), ' ', COALESCE(m.musteri_soyadi, '')) AS musteri,
            COALESCE(GROUP_CONCAT(DISTINCT u.urun_adi SEPARATOR ', '), 'Ürün bilgisi yok') AS urunler,
            i.iade_tutari,
            i.iade_tarihi,
            COALESCE(sn.satis_noktasi_adi, '-') AS satis_noktasi,
            i.aciklama,
            COALESCE(SUM(sd.adet), 0) AS iade_adedi
        FROM iadeler i
        LEFT JOIN faturalar f ON i.fatura_no = f.fatura_no
        LEFT JOIN musteriler m ON f.musteri_id = m.musteri_id
        LEFT JOIN satis_noktalari sn ON f.satis_noktasi_id = sn.satis_noktasi_id
        LEFT JOIN siparis_detaylari sd ON f.fatura_no = sd.fatura_no
        LEFT JOIN urunler u ON sd.urun_id = u.urun_id
        WHERE {where_sql}
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
    """), params).fetchall()

    product_counts = {}

    for row in rows:
        product_name = row[3] or "Ürün bilgisi yok"
        product_counts[product_name] = product_counts.get(product_name, 0) + 1

    veriler = []

    for row in rows:
        product_name = row[3] or "Ürün bilgisi yok"
        risk_level = get_return_risk_level(product_counts.get(product_name, 1))

        item = {
            "iade_id": int(row[0] or 0),
            "iade_no": f"IADE-{row[0]}",
            "fatura_no": row[1],
            "musteri": row[2].strip() if row[2] and row[2].strip() else "-",
            "urun": product_name,
            "iade_tutari": float(row[4] or 0),
            "tarih": str(row[5]) if row[5] else "-",
            "satis_noktasi": row[6] or "-",
            "aciklama": row[7] or "-",
            "iade_adedi": int(row[8] or 0),
            "risk": risk_level
        }

        if risk and risk != "all" and item["risk"] != risk:
            continue

        veriler.append(item)

    total_count = len(veriler)
    toplam_sayfa = (total_count + limit - 1) // limit if limit else 1
    offset = (page - 1) * limit

    return {
        "toplam_kayit": total_count,
        "toplam_sayfa": toplam_sayfa,
        "page": int(page),
        "limit": int(limit),
        "offset": int(offset),
        "veriler": veriler[offset:offset + limit]
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

