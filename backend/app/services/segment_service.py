from sqlalchemy import text


def get_segments(db):
    rows = db.execute(text("""
        SELECT 
            segment_id,
            segment_adi,
            davranis_tanimi
        FROM segmentler
        ORDER BY segment_id
    """)).fetchall()

    return [
        {
            "segment_id": r[0],
            "segment_adi": r[1],
            "davranis_tanimi": r[2]
        }
        for r in rows
    ]


def get_customers_by_segment(db, segment_id: int):
    rows = db.execute(text("""
        SELECT 
            m.musteri_id,
            m.musteri_kodu,
            m.musteri_adi,
            m.musteri_soyadi,
            r.r_skoru,
            r.f_skoru,
            r.m_skoru,
            r.toplam_rfm_skoru
        FROM rfm_analizi r
        INNER JOIN musteriler m ON r.musteri_id = m.musteri_id
        WHERE r.segment_id = :segment_id
    """), {"segment_id": segment_id}).fetchall()

    return [
        {
            "musteri_id": r[0],
            "musteri_kodu": r[1],
            "musteri_adi": r[2],
            "musteri_soyadi": r[3],
            "r_skoru": r[4],
            "f_skoru": r[5],
            "m_skoru": r[6],
            "toplam_rfm_skoru": r[7]
        }
        for r in rows
    ]