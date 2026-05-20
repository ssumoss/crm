from sqlalchemy import text

from app.utils.mask import mask_email, mask_phone, has_sensitive_permission


MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]


def format_sensitive_data(mail, gsm, current_user):
    if has_sensitive_permission(current_user):
        return mail, gsm

    return mask_email(mail), mask_phone(gsm)


def get_all_customers_service(
    db,
    current_user,
    page=1,
    limit=50,
    search="",
    segment="all",
    city="all",
    risk="all"
):
    offset = (page - 1) * limit

    conditions = []

    if search:
        conditions.append(f"""
            (
                LOWER(m.musteri_adi) LIKE LOWER('%{search}%')
                OR LOWER(m.musteri_soyadi) LIKE LOWER('%{search}%')
                OR LOWER(m.mail) LIKE LOWER('%{search}%')
                OR LOWER(m.gsm_no) LIKE LOWER('%{search}%')
            )
        """)

    if segment != "all":
        conditions.append(f"s.segment_adi = '{segment}'")

    if city != "all":
        conditions.append(f"se.sehir_adi = '{city}'")

    if risk == "Yüksek":
        conditions.append("a.churn_olasiligi >= 70")

    elif risk == "Orta":
        conditions.append("a.churn_olasiligi >= 40 AND a.churn_olasiligi < 70")

    elif risk == "Düşük":
        conditions.append("a.churn_olasiligi < 40")

    where_sql = ""

    if conditions:
        where_sql = "WHERE " + " AND ".join(conditions)

    total_query = f"""
        SELECT COUNT(*) FROM (
            SELECT m.musteri_id
            FROM musteriler m
            LEFT JOIN satis_noktalari sn
                ON m.satis_noktasi_id = sn.satis_noktasi_id
            LEFT JOIN sehirler se
                ON sn.sehir_id = se.sehir_id
            LEFT JOIN rfm_analizi r
                ON m.musteri_id = r.musteri_id
            LEFT JOIN segmentler s
                ON r.segment_id = s.segment_id
            LEFT JOIN analitik_tahminler a
                ON m.musteri_id = a.musteri_id
            {where_sql}
            GROUP BY m.musteri_id
        ) AS total_table
    """

    total_row = db.execute(text(total_query)).fetchone()

    total_count = int(total_row[0] or 0)
    total_pages = (total_count + limit - 1) // limit

    query = f"""
        SELECT 
            m.musteri_id,
            m.musteri_adi,
            m.musteri_soyadi,
            m.mail,
            m.gsm_no,
            COALESCE(se.sehir_adi, '-') AS sehir_adi,
            COALESCE(SUM(CASE WHEN f.belge_tipi_id = 1 THEN f.fatura_tutari ELSE 0 END), 0) AS toplam_harcama,
            MAX(f.fatura_tarihi) AS son_siparis,
            COALESCE(r.toplam_rfm_skoru, 0) AS rfm_skor,
            COALESCE(s.segment_adi, '-') AS segment_adi,
            COALESCE(a.ltv_tahmini, 0) AS ltv_tahmini,
            COALESCE(a.churn_olasiligi, 0) AS churn_olasiligi
        FROM musteriler m
        LEFT JOIN satis_noktalari sn 
            ON m.satis_noktasi_id = sn.satis_noktasi_id
        LEFT JOIN sehirler se 
            ON sn.sehir_id = se.sehir_id
        LEFT JOIN faturalar f 
            ON m.musteri_id = f.musteri_id
        LEFT JOIN rfm_analizi r 
            ON m.musteri_id = r.musteri_id
        LEFT JOIN segmentler s 
            ON r.segment_id = s.segment_id
        LEFT JOIN analitik_tahminler a 
            ON m.musteri_id = a.musteri_id
        {where_sql}
        GROUP BY 
            m.musteri_id,
            m.musteri_adi,
            m.musteri_soyadi,
            m.mail,
            m.gsm_no,
            se.sehir_adi,
            r.toplam_rfm_skoru,
            s.segment_adi,
            a.ltv_tahmini,
            a.churn_olasiligi
        ORDER BY m.musteri_id DESC
        LIMIT :limit OFFSET :offset
    """

    rows = db.execute(text(query), {
        "limit": limit,
        "offset": offset
    }).fetchall()

    veriler = []

    for r in rows:
        mail, gsm = format_sensitive_data(r[3], r[4], current_user)

        veriler.append({
            "musteri_id": r[0],
            "adi": r[1],
            "soyadi": r[2],
            "mail": mail,
            "gsm": gsm,
            "sehir": r[5],
            "toplam_harcama": float(r[6] or 0),
            "son_siparis": str(r[7]) if r[7] else "-",
            "rfm_skor": int(r[8] or 0),
            "segment": r[9],
            "ltv": float(r[10] or 0),
            "churn": float(r[11] or 0)
        })

    return {
        "kayit_sayisi": total_count,
        "sayfa": page,
        "limit": limit,
        "toplam_sayfa": total_pages,
        "veriler": veriler
    }

def get_customer_filter_options_service(db):
    segment_rows = db.execute(text("""
        SELECT DISTINCT segment_adi
        FROM segmentler
        ORDER BY segment_adi
    """)).fetchall()

    city_rows = db.execute(text("""
        SELECT DISTINCT se.sehir_adi
        FROM sehirler se
        ORDER BY se.sehir_adi
    """)).fetchall()

    return {
        "segments": [r[0] for r in segment_rows if r[0]],
        "cities": [r[0] for r in city_rows if r[0]]
    }


def get_customer_detail_service(db, musteri_id: int, current_user):
    row = db.execute(text("""
        SELECT 
            m.musteri_id,
            m.musteri_adi,
            m.musteri_soyadi,
            m.mail,
            m.gsm_no,
            COALESCE(se.sehir_adi, '-') AS sehir_adi,
            COUNT(CASE WHEN f.belge_tipi_id = 1 THEN f.fatura_no END) AS siparis_sayisi,
            COALESCE(SUM(CASE WHEN f.belge_tipi_id = 1 THEN f.fatura_tutari ELSE 0 END), 0) AS toplam_harcama,
            MAX(f.fatura_tarihi) AS son_siparis
        FROM musteriler m
        LEFT JOIN satis_noktalari sn 
            ON m.satis_noktasi_id = sn.satis_noktasi_id
        LEFT JOIN sehirler se 
            ON sn.sehir_id = se.sehir_id
        LEFT JOIN faturalar f 
            ON m.musteri_id = f.musteri_id
        WHERE m.musteri_id = :id
        GROUP BY 
            m.musteri_id,
            m.musteri_adi,
            m.musteri_soyadi,
            m.mail,
            m.gsm_no,
            se.sehir_adi
    """), {"id": musteri_id}).fetchone()

    if not row:
        return None

    mail, gsm = format_sensitive_data(row[3], row[4], current_user)

    return {
        "musteri_id": row[0],
        "adi": row[1],
        "soyadi": row[2],
        "mail": mail,
        "gsm": gsm,
        "sehir": row[5],
        "siparis_sayisi": int(row[6] or 0),
        "toplam_harcama": float(row[7] or 0),
        "son_siparis": str(row[8]) if row[8] else "-"
    }


def get_customer_analytics_service(db, musteri_id: int):
    row = db.execute(text("""
        SELECT 
            r.recency_degeri,
            r.frequency_degeri,
            r.monetary_degeri,
            r.r_skoru,
            r.f_skoru,
            r.m_skoru,
            r.toplam_rfm_skoru,
            s.segment_adi,
            a.ltv_tahmini,
            a.churn_olasiligi
        FROM rfm_analizi r
        LEFT JOIN segmentler s 
            ON r.segment_id = s.segment_id
        LEFT JOIN analitik_tahminler a 
            ON r.musteri_id = a.musteri_id
        WHERE r.musteri_id = :id
    """), {"id": musteri_id}).fetchone()

    if not row:
        return None

    return {
        "recency": int(row[0] or 0),
        "frequency": int(row[1] or 0),
        "monetary": float(row[2] or 0),
        "r_skoru": int(row[3] or 0),
        "f_skoru": int(row[4] or 0),
        "m_skoru": int(row[5] or 0),
        "rfm_skor": int(row[6] or 0),
        "segment": row[7] or "-",
        "ltv": float(row[8] or 0),
        "churn": float(row[9] or 0)
    }


def get_top_customers_service(db):
    rows = db.execute(text("""
        SELECT 
            m.musteri_id,
            m.musteri_adi,
            m.musteri_soyadi,
            COALESCE(a.ltv_tahmini, 0) AS ltv_tahmini
        FROM analitik_tahminler a
        INNER JOIN musteriler m 
            ON a.musteri_id = m.musteri_id
        ORDER BY a.ltv_tahmini DESC
    """)).fetchall()

    return {
        "kayit_sayisi": len(rows),
        "veriler": [
            {
                "musteri_id": r[0],
                "adi": r[1],
                "soyadi": r[2],
                "ltv": float(r[3] or 0)
            }
            for r in rows
        ]
    }


def get_risky_customers_service(db):
    rows = db.execute(text("""
        SELECT 
            m.musteri_id,
            m.musteri_adi,
            m.musteri_soyadi,
            COALESCE(a.churn_olasiligi, 0) AS churn_olasiligi
        FROM analitik_tahminler a
        INNER JOIN musteriler m 
            ON a.musteri_id = m.musteri_id
        ORDER BY a.churn_olasiligi DESC
    """)).fetchall()

    return {
        "kayit_sayisi": len(rows),
        "veriler": [
            {
                "musteri_id": r[0],
                "adi": r[1],
                "soyadi": r[2],
                "churn": float(r[3] or 0)
            }
            for r in rows
        ]
    }


def get_customers_by_segment_service(db, segment_id: int):
    rows = db.execute(text("""
        SELECT 
            m.musteri_id,
            m.musteri_adi,
            m.musteri_soyadi,
            COALESCE(r.toplam_rfm_skoru, 0) AS rfm_skor
        FROM rfm_analizi r
        INNER JOIN musteriler m 
            ON r.musteri_id = m.musteri_id
        WHERE r.segment_id = :sid
    """), {"sid": segment_id}).fetchall()

    return {
        "kayit_sayisi": len(rows),
        "veriler": [
            {
                "musteri_id": r[0],
                "adi": r[1],
                "soyadi": r[2],
                "rfm_skor": int(r[3] or 0)
            }
            for r in rows
        ]
    }


def get_customer_spending_trend_service(db, musteri_id: int, year: int):
    rows = db.execute(text("""
        SELECT 
            MONTH(fatura_tarihi) AS ay,
            COALESCE(SUM(fatura_tutari), 0) AS toplam_harcama
        FROM faturalar
        WHERE musteri_id = :musteri_id
          AND YEAR(fatura_tarihi) = :year
          AND belge_tipi_id = 1
        GROUP BY MONTH(fatura_tarihi)
        ORDER BY ay
    """), {
        "musteri_id": musteri_id,
        "year": year
    }).fetchall()

    data = {int(r[0]): float(r[1] or 0) for r in rows}

    return [
        {
            "ay_no": i,
            "ay": month,
            "toplam_harcama": data.get(i, 0)
        }
        for i, month in enumerate(MONTHS, start=1)
    ]


def get_customer_order_frequency_service(db, musteri_id: int, year: int):
    rows = db.execute(text("""
        SELECT 
            MONTH(fatura_tarihi) AS ay,
            COUNT(*) AS siparis_sayisi
        FROM faturalar
        WHERE musteri_id = :musteri_id
          AND YEAR(fatura_tarihi) = :year
          AND belge_tipi_id = 1
        GROUP BY MONTH(fatura_tarihi)
        ORDER BY ay
    """), {
        "musteri_id": musteri_id,
        "year": year
    }).fetchall()

    data = {int(r[0]): int(r[1] or 0) for r in rows}

    return [
        {
            "ay_no": i,
            "ay": month,
            "siparis_sayisi": data.get(i, 0)
        }
        for i, month in enumerate(MONTHS, start=1)
    ]


def get_customer_brand_distribution_service(db, musteri_id: int, year: int):
    rows = db.execute(text("""
        SELECT 
            COALESCE(mk.marka_adi, 'Bilinmiyor') AS marka_adi,
            COALESCE(SUM(sd.adet), 0) AS adet
        FROM faturalar f
        INNER JOIN siparis_detaylari sd
            ON f.fatura_no = sd.fatura_no
        INNER JOIN urunler u
            ON sd.urun_id = u.urun_id
        LEFT JOIN markalar mk
            ON u.marka_id = mk.marka_id
        WHERE f.musteri_id = :musteri_id
          AND YEAR(f.fatura_tarihi) = :year
          AND f.belge_tipi_id = 1
        GROUP BY mk.marka_adi
        ORDER BY adet DESC
        LIMIT 4
    """), {
        "musteri_id": musteri_id,
        "year": year
    }).fetchall()

    return [
        {
            "marka": r[0],
            "adet": int(r[1] or 0)
        }
        for r in rows
    ]


def get_customer_segment_history_years_service(db, musteri_id: int):
    rows = db.execute(text("""
        SELECT 
            msg.yil,
            COALESCE(s.segment_adi, '-') AS segment_adi
        FROM musteri_segment_gecmis msg
        LEFT JOIN segmentler s
            ON msg.segment_id = s.segment_id
        WHERE msg.musteri_id = :musteri_id
        ORDER BY msg.yil
    """), {"musteri_id": musteri_id}).fetchall()

    year_map = {int(r[0]): r[1] for r in rows}

    years = [2023, 2024, 2025]

    return [
        {
            "yil": year,
            "segment": year_map.get(year, "-")
        }
        for year in years
    ]
