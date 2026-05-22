from sqlalchemy import text


def get_all_invoices_service(
    db,
    page: int = 1,
    limit: int = 50,
    search: str | None = None,
    belge_tipi: str | None = None,
    satis_noktasi: str | None = None
):
    offset = (page - 1) * limit

    where = ["1=1"]
    params = {
        "limit": limit,
        "offset": offset
    }

    if search:
        where.append("""
            (
                f.fatura_no LIKE :search
                OR m.musteri_adi LIKE :search
                OR m.musteri_soyadi LIKE :search
                OR sn.satis_noktasi_adi LIKE :search
            )
        """)
        params["search"] = f"%{search}%"

    if belge_tipi and belge_tipi != "all":
        where.append("bt.belge_tipi_adi = :belge_tipi")
        params["belge_tipi"] = belge_tipi

    if satis_noktasi and satis_noktasi != "all":
        where.append("sn.satis_noktasi_adi = :satis_noktasi")
        params["satis_noktasi"] = satis_noktasi

    where_sql = " AND ".join(where)

    total_count = db.execute(text(f"""
        SELECT COUNT(DISTINCT f.fatura_no)
        FROM faturalar f
        LEFT JOIN musteriler m 
            ON f.musteri_id = m.musteri_id
        LEFT JOIN belge_tipi bt 
            ON f.belge_tipi_id = bt.belge_tipi_id
        LEFT JOIN satis_noktalari sn 
            ON f.satis_noktasi_id = sn.satis_noktasi_id
        WHERE {where_sql}
    """), params).scalar()

    rows = db.execute(text(f"""
        SELECT
            f.fatura_no,
            CONCAT(m.musteri_adi, ' ', m.musteri_soyadi) AS musteri,
            f.fatura_tutari,
            f.fatura_tarihi,
            bt.belge_tipi_adi,
            sn.satis_noktasi_adi,
            COUNT(sd.siparis_id) AS kalem_sayisi
        FROM faturalar f
        LEFT JOIN musteriler m 
            ON f.musteri_id = m.musteri_id
        LEFT JOIN belge_tipi bt 
            ON f.belge_tipi_id = bt.belge_tipi_id
        LEFT JOIN satis_noktalari sn 
            ON f.satis_noktasi_id = sn.satis_noktasi_id
        LEFT JOIN siparis_detaylari sd 
            ON f.fatura_no = sd.fatura_no
        WHERE {where_sql}
        GROUP BY
            f.fatura_no,
            m.musteri_adi,
            m.musteri_soyadi,
            f.fatura_tutari,
            f.fatura_tarihi,
            bt.belge_tipi_adi,
            sn.satis_noktasi_adi
        ORDER BY f.fatura_tarihi DESC
        LIMIT :limit OFFSET :offset
    """), params).fetchall()

    total_count = int(total_count or 0)
    toplam_sayfa = (total_count + limit - 1) // limit

    return {
        "toplam_kayit": total_count,
        "toplam_sayfa": toplam_sayfa,
        "page": int(page),
        "limit": int(limit),
        "offset": int(offset),
        "veriler": [
            {
                "fatura_no": row[0],
                "musteri": row[1] or "-",
                "tutar": float(row[2] or 0),
                "tarih": str(row[3]) if row[3] else "-",
                "belge_tipi": row[4] or "-",
                "satis_noktasi": row[5] or "-",
                "kalem_sayisi": int(row[6] or 0)
            }
            for row in rows
        ]
    }


def get_invoice_summary_service(db):
    row = db.execute(text("""
        SELECT
            COUNT(*) AS toplam_fatura,
            COUNT(CASE WHEN belge_tipi_id = 1 THEN 1 END) AS satis_sayisi,
            COUNT(CASE WHEN belge_tipi_id = 2 THEN 1 END) AS iade_sayisi,
            COALESCE(SUM(CASE WHEN belge_tipi_id = 1 THEN fatura_tutari ELSE 0 END), 0) AS toplam_satis,
            COALESCE(AVG(CASE WHEN belge_tipi_id = 1 THEN fatura_tutari END), 0) AS ortalama_fatura
        FROM faturalar
    """)).fetchone()

    return {
        "toplam_fatura": int(row[0] or 0),
        "satis_sayisi": int(row[1] or 0),
        "iade_sayisi": int(row[2] or 0),
        "toplam_satis": float(row[3] or 0),
        "ortalama_fatura": float(row[4] or 0)
    }


def get_invoice_monthly_trend_service(db, year: int):
    rows = db.execute(text("""
        SELECT
            MONTH(fatura_tarihi) AS ay,
            COUNT(CASE WHEN belge_tipi_id = 1 THEN 1 END) AS satis_sayisi,
            COUNT(CASE WHEN belge_tipi_id = 2 THEN 1 END) AS iade_sayisi,
            COALESCE(SUM(CASE WHEN belge_tipi_id = 1 THEN fatura_tutari ELSE 0 END), 0) AS satis_tutari
        FROM faturalar
        WHERE YEAR(fatura_tarihi) = :year
        GROUP BY MONTH(fatura_tarihi)
        ORDER BY ay
    """), {"year": year}).fetchall()

    months = [
        "Oca", "Şub", "Mar", "Nis", "May", "Haz",
        "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"
    ]

    data = {
        int(row[0]): {
            "satis_sayisi": int(row[1] or 0),
            "iade_sayisi": int(row[2] or 0),
            "satis_tutari": float(row[3] or 0)
        }
        for row in rows
    }

    return [
        {
            "ay_no": i,
            "ay": month,
            "satis_sayisi": data.get(i, {}).get("satis_sayisi", 0),
            "iade_sayisi": data.get(i, {}).get("iade_sayisi", 0),
            "satis_tutari": data.get(i, {}).get("satis_tutari", 0)
        }
        for i, month in enumerate(months, start=1)
    ]


def get_invoice_basket_analysis_service(db, year: int):
    rows = db.execute(text("""
        SELECT
            kalem_sayisi,
            COUNT(*) AS fatura_sayisi
        FROM (
            SELECT
                f.fatura_no,
                COUNT(sd.siparis_id) AS kalem_sayisi
            FROM faturalar f
            LEFT JOIN siparis_detaylari sd 
                ON f.fatura_no = sd.fatura_no
            WHERE YEAR(f.fatura_tarihi) = :year
              AND f.belge_tipi_id = 1
            GROUP BY f.fatura_no
        ) x
        GROUP BY kalem_sayisi
        ORDER BY fatura_sayisi DESC
        LIMIT 5
    """), {"year": year}).fetchall()

    return [
        {
            "kalem_sayisi": int(row[0] or 0),
            "fatura_sayisi": int(row[1] or 0)
        }
        for row in rows
    ]