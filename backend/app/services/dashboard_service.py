from sqlalchemy import text


MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]


def get_dashboard_summary_service(db):
    total_customers = db.execute(text("""
        SELECT COUNT(*) FROM musteriler
    """)).scalar()

    total_products = db.execute(text("""
        SELECT COUNT(*) FROM urunler
    """)).scalar()

    total_orders = db.execute(text("""
        SELECT COUNT(*) FROM faturalar
    """)).scalar()

    total_revenue = db.execute(text("""
        SELECT COALESCE(SUM(fatura_tutari), 0)
        FROM faturalar
        WHERE belge_tipi_id = 1
    """)).scalar()

    analyzed_customers = db.execute(text("""
        SELECT COUNT(*) FROM rfm_analizi
    """)).scalar()

    champions = db.execute(text("""
        SELECT COUNT(*) FROM rfm_analizi WHERE segment_id = 1
    """)).scalar()

    risky_customers = db.execute(text("""
        SELECT COUNT(*) 
        FROM analitik_tahminler
        WHERE churn_olasiligi >= 70
    """)).scalar()

    avg_ltv = db.execute(text("""
        SELECT COALESCE(AVG(ltv_tahmini), 0)
        FROM analitik_tahminler
        WHERE ltv_tahmini > 0
    """)).scalar()

    avg_churn = db.execute(text("""
        SELECT COALESCE(AVG(churn_olasiligi), 0)
        FROM analitik_tahminler
    """)).scalar()

    top_segment = db.execute(text("""
        SELECT 
            s.segment_adi,
            COUNT(*) AS musteri_sayisi
        FROM rfm_analizi r
        LEFT JOIN segmentler s ON r.segment_id = s.segment_id
        GROUP BY s.segment_adi
        ORDER BY musteri_sayisi DESC
        LIMIT 1
    """)).fetchone()

    segment_distribution = db.execute(text("""
        SELECT
            s.segment_id,
            s.segment_adi,
            COUNT(r.musteri_id) AS musteri_sayisi
        FROM segmentler s
        LEFT JOIN rfm_analizi r ON s.segment_id = r.segment_id
        GROUP BY s.segment_id, s.segment_adi
        ORDER BY s.segment_id
    """)).fetchall()

    top_customers = db.execute(text("""
        SELECT
            m.musteri_id,
            m.musteri_adi,
            m.musteri_soyadi,
            a.ltv_tahmini
        FROM analitik_tahminler a
        INNER JOIN musteriler m ON a.musteri_id = m.musteri_id
        ORDER BY a.ltv_tahmini DESC
        LIMIT 5
    """)).fetchall()

    critical_risk = db.execute(text("""
        SELECT
            m.musteri_id,
            m.musteri_adi,
            m.musteri_soyadi,
            a.churn_olasiligi
        FROM analitik_tahminler a
        INNER JOIN musteriler m ON a.musteri_id = m.musteri_id
        WHERE a.churn_olasiligi >= 80
        ORDER BY a.churn_olasiligi DESC
        LIMIT 5
    """)).fetchall()

    city_sales = db.execute(text("""
        SELECT 
            COALESCE(sehirler.sehir_adi, 'Bilinmiyor') AS sehir_adi,
            COALESCE(SUM(faturalar.fatura_tutari), 0) AS toplam_ciro
        FROM faturalar
        LEFT JOIN satis_noktalari 
            ON faturalar.satis_noktasi_id = satis_noktalari.satis_noktasi_id
        LEFT JOIN sehirler 
            ON satis_noktalari.sehir_id = sehirler.sehir_id
        WHERE faturalar.belge_tipi_id = 1
        GROUP BY sehir_adi
        ORDER BY toplam_ciro DESC
        LIMIT 5
    """)).fetchall()

    channel_sales = db.execute(text("""
        SELECT 
            COALESCE(satis_tipleri.satis_tipi_adi, 'Bilinmiyor') AS kanal_adi,
            COALESCE(SUM(faturalar.fatura_tutari), 0) AS toplam_ciro
        FROM faturalar
        LEFT JOIN satis_noktalari 
            ON faturalar.satis_noktasi_id = satis_noktalari.satis_noktasi_id
        LEFT JOIN satis_tipleri 
            ON satis_noktalari.satis_tipi_id = satis_tipleri.satis_tipi_id
        WHERE faturalar.belge_tipi_id = 1
        GROUP BY kanal_adi
        ORDER BY toplam_ciro DESC
    """)).fetchall()

    return_summary = db.execute(text("""
    SELECT
        (SELECT COUNT(*) 
         FROM faturalar 
         WHERE belge_tipi_id = 1) AS toplam_satis,

        (SELECT COUNT(*) 
         FROM iadeler) AS toplam_iade,

        (SELECT COALESCE(SUM(iade_tutari),0)
         FROM iadeler) AS toplam_iade_tutari
""")).fetchone()

    toplam_satis = return_summary[0] or 0
    toplam_iade = return_summary[1] or 0
    toplam_iade_tutari = return_summary[2] or 0
    iade_orani = (toplam_iade / toplam_satis * 100) if toplam_satis > 0 else 0

    channel_total = sum(float(row[1] or 0) for row in channel_sales)

    return {
        "genel_ozet": {
            "toplam_musteri": int(total_customers or 0),
            "toplam_urun": int(total_products or 0),
            "toplam_siparis": int(total_orders or 0),
            "toplam_ciro": float(total_revenue or 0),
            "analiz_edilen_musteri": int(analyzed_customers or 0),
            "sampiyon_musteri_sayisi": int(champions or 0),
            "riskli_musteri_sayisi": int(risky_customers or 0),
            "ortalama_ltv": float(avg_ltv or 0),
            "ortalama_churn": float(avg_churn or 0)
        },
        "en_buyuk_segment": {
            "segment_adi": top_segment[0] if top_segment else None,
            "musteri_sayisi": int(top_segment[1]) if top_segment else 0
        },
        "segment_dagilimi": [
            {
                "segment_id": row[0],
                "segment_adi": row[1],
                "musteri_sayisi": int(row[2])
            }
            for row in segment_distribution
        ],
        "en_degerli_musteriler": [
            {
                "musteri_id": row[0],
                "musteri_adi": row[1],
                "musteri_soyadi": row[2],
                "ltv_tahmini": float(row[3] or 0)
            }
            for row in top_customers
        ],
        "kritik_kayip_riski": [
            {
                "musteri_id": row[0],
                "musteri_adi": row[1],
                "musteri_soyadi": row[2],
                "churn_olasiligi": float(row[3] or 0)
            }
            for row in critical_risk
        ],
        "sehir_bazli_satis": [
            {
                "sehir_adi": row[0],
                "toplam_ciro": float(row[1] or 0)
            }
            for row in city_sales
        ],
        "kanal_bazli_satis": [
            {
                "kanal_adi": row[0],
                "toplam_ciro": float(row[1] or 0),
                "oran": round((float(row[1] or 0) / channel_total * 100), 1) if channel_total > 0 else 0
            }
            for row in channel_sales
        ],
        "iade_ozet": {
            "toplam_satis": int(toplam_satis),
            "toplam_iade": int(toplam_iade),
            "toplam_iade_tutari": float(toplam_iade_tutari or 0),
            "iade_orani": round(float(iade_orani), 2)
        }
    }


def get_dashboard_years_service(db):
    rows = db.execute(text("""
        SELECT DISTINCT YEAR(fatura_tarihi) AS yil
        FROM faturalar
        WHERE fatura_tarihi IS NOT NULL
        ORDER BY yil
    """)).fetchall()

    return [int(row[0]) for row in rows if row[0] is not None]


def get_monthly_sales_service(db, year: int):
    rows = db.execute(text("""
        SELECT 
            MONTH(fatura_tarihi) AS ay,
            COALESCE(SUM(fatura_tutari), 0) AS toplam_ciro
        FROM faturalar
        WHERE YEAR(fatura_tarihi) = :year
          AND belge_tipi_id = 1
        GROUP BY MONTH(fatura_tarihi)
        ORDER BY ay
    """), {"year": year}).fetchall()

    data = {int(row[0]): float(row[1] or 0) for row in rows}

    return [
        {
            "ay_no": i,
            "ay": month_name,
            "toplam_ciro": data.get(i, 0)
        }
        for i, month_name in enumerate(MONTHS, start=1)
    ]


def get_city_sales_service(db, year: int):
    rows = db.execute(text("""
        SELECT 
            COALESCE(sehirler.sehir_adi, 'Bilinmiyor') AS sehir_adi,
            COALESCE(SUM(faturalar.fatura_tutari), 0) AS toplam_ciro
        FROM faturalar
        LEFT JOIN satis_noktalari 
            ON faturalar.satis_noktasi_id = satis_noktalari.satis_noktasi_id
        LEFT JOIN sehirler 
            ON satis_noktalari.sehir_id = sehirler.sehir_id
        WHERE YEAR(faturalar.fatura_tarihi) = :year
          AND faturalar.belge_tipi_id = 1
        GROUP BY sehir_adi
        ORDER BY toplam_ciro DESC
        LIMIT 5
    """), {"year": year}).fetchall()

    return [
        {
            "sehir_adi": row[0],
            "toplam_ciro": float(row[1] or 0)
        }
        for row in rows
    ]


def get_monthly_aov_service(db, year: int):
    rows = db.execute(text("""
        SELECT 
            MONTH(fatura_tarihi) AS ay,
            COALESCE(SUM(fatura_tutari), 0) AS toplam_ciro,
            COUNT(*) AS siparis_sayisi
        FROM faturalar
        WHERE YEAR(fatura_tarihi) = :year
          AND belge_tipi_id = 1
        GROUP BY MONTH(fatura_tarihi)
        ORDER BY ay
    """), {"year": year}).fetchall()

    data = {}

    for row in rows:
        ay = int(row[0])
        toplam_ciro = float(row[1] or 0)
        siparis_sayisi = int(row[2] or 0)
        data[ay] = toplam_ciro / siparis_sayisi if siparis_sayisi > 0 else 0

    return [
        {
            "ay_no": i,
            "ay": month_name,
            "ortalama_sepet": round(data.get(i, 0), 2)
        }
        for i, month_name in enumerate(MONTHS, start=1)
    ]


def get_monthly_return_rate_service(db, year: int):
    rows = db.execute(text("""
        SELECT 
            MONTH(fatura_tarihi) AS ay,
            COUNT(CASE WHEN belge_tipi_id = 1 THEN 1 END) AS satis_sayisi,
            COUNT(CASE WHEN belge_tipi_id = 2 THEN 1 END) AS iade_sayisi
        FROM faturalar
        WHERE YEAR(fatura_tarihi) = :year
        GROUP BY MONTH(fatura_tarihi)
        ORDER BY ay
    """), {"year": year}).fetchall()

    data = {}

    for row in rows:
        ay = int(row[0])
        satis_sayisi = int(row[1] or 0)
        iade_sayisi = int(row[2] or 0)
        data[ay] = (iade_sayisi / satis_sayisi * 100) if satis_sayisi > 0 else 0

    return [
        {
            "ay_no": i,
            "ay": month_name,
            "iade_orani": round(data.get(i, 0), 2)
        }
        for i, month_name in enumerate(MONTHS, start=1)
    ]


def search_dashboard_service(db, q: str):
    keyword = f"%{q}%"

    customers = db.execute(text("""
        SELECT 
            musteri_id,
            musteri_adi,
            musteri_soyadi,
            gsm_no,
            mail
        FROM musteriler
        WHERE musteri_adi LIKE :keyword
           OR musteri_soyadi LIKE :keyword
           OR gsm_no LIKE :keyword
           OR mail LIKE :keyword
        LIMIT 5
    """), {"keyword": keyword}).fetchall()

    invoices = db.execute(text("""
        SELECT 
            fatura_no,
            fatura_tarihi,
            fatura_tutari
        FROM faturalar
        WHERE CAST(fatura_no AS CHAR) LIKE :keyword
        LIMIT 5
    """), {"keyword": keyword}).fetchall()

    return {
        "musteriler": [
            {
                "musteri_id": row[0],
                "ad_soyad": f"{row[1] or ''} {row[2] or ''}".strip(),
                "gsm_no": row[3],
                "mail": row[4]
            }
            for row in customers
        ],
        "faturalar": [
            {
                "fatura_no": row[0],
                "fatura_tarihi": str(row[1]),
                "fatura_tutari": float(row[2] or 0)
            }
            for row in invoices
        ]
    }