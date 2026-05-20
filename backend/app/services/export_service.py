from sqlalchemy import text


def get_full_export_service(
    db,
    start_date: str | None = None,
    end_date: str | None = None,
    segment: str | None = None,
    city: str | None = None,
    point: str | None = None
):
    where = []
    params = {}

    if start_date:
        where.append("DATE(f.fatura_tarihi) >= :start_date")
        params["start_date"] = start_date

    if end_date:
        where.append("DATE(f.fatura_tarihi) <= :end_date")
        params["end_date"] = end_date

    if segment and segment != "all":
        where.append("s.segment_adi = :segment")
        params["segment"] = segment

    if city and city != "all":
        where.append("se.sehir_adi = :city")
        params["city"] = city

    if point and point != "all":
        where.append("sn.satis_noktasi_adi = :point")
        params["point"] = point

    where_sql = ""
    if where:
        where_sql = "WHERE " + " AND ".join(where)

    rows = db.execute(text(f"""
        SELECT
            m.musteri_id,
            m.musteri_kodu,
            m.musteri_adi,
            m.musteri_soyadi,
            m.mail,
            m.gsm_no,
            m.kayit_tarihi,

            f.fatura_no,
            f.fatura_tarihi,
            f.fatura_tutari,
            f.belge_tipi_id,

            sn.satis_noktasi_adi,
            se.sehir_adi,

            r.recency_degeri,
            r.frequency_degeri,
            r.monetary_degeri,
            r.r_skoru,
            r.f_skoru,
            r.m_skoru,
            r.toplam_rfm_skoru,

            s.segment_adi,

            a.ltv_tahmini,
            a.churn_olasiligi,
            a.hesaplama_tarihi,

            ao.aksiyon_aciklamasi

        FROM musteriler m
        LEFT JOIN faturalar f
            ON m.musteri_id = f.musteri_id
        LEFT JOIN satis_noktalari sn
            ON f.satis_noktasi_id = sn.satis_noktasi_id
        LEFT JOIN sehirler se
            ON sn.sehir_id = se.sehir_id
        LEFT JOIN rfm_analizi r
            ON m.musteri_id = r.musteri_id
        LEFT JOIN segmentler s
            ON r.segment_id = s.segment_id
        LEFT JOIN analitik_tahminler a
            ON m.musteri_id = a.musteri_id
        LEFT JOIN aksiyon_onerileri ao
            ON r.segment_id = ao.segment_id

        {where_sql}

        ORDER BY m.musteri_id, f.fatura_tarihi DESC
    """), params).fetchall()

    data = []

    for row in rows:
        data.append({
            "musteri_id": row[0],
            "musteri_kodu": row[1],
            "musteri_adi": row[2],
            "musteri_soyadi": row[3],
            "mail": row[4],
            "gsm_no": row[5],
            "kayit_tarihi": str(row[6]) if row[6] else None,

            "fatura_no": row[7],
            "fatura_tarihi": str(row[8]) if row[8] else None,
            "fatura_tutari": float(row[9] or 0),
            "belge_tipi_id": row[10],

            "satis_noktasi_adi": row[11],
            "sehir_adi": row[12],

            "recency_degeri": int(row[13]) if row[13] is not None else None,
            "frequency_degeri": int(row[14]) if row[14] is not None else None,
            "monetary_degeri": float(row[15]) if row[15] is not None else None,
            "r_skoru": row[16],
            "f_skoru": row[17],
            "m_skoru": row[18],
            "toplam_rfm_skoru": row[19],

            "segment_adi": row[20],

            "ltv_tahmini": float(row[21]) if row[21] is not None else None,
            "churn_olasiligi": float(row[22]) if row[22] is not None else None,
            "hesaplama_tarihi": str(row[23]) if row[23] else None,

            "aksiyon_onerisi": row[24]
        })

    unique_customer_count = len(set(
        item["musteri_id"] for item in data if item["musteri_id"] is not None
    ))

    return {
        "kayit_sayisi": len(data),
        "benzersiz_musteri_sayisi": unique_customer_count,
        "veriler": data
    }