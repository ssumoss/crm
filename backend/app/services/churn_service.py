from datetime import datetime
from sqlalchemy import text


def run_churn(db):
    rows = db.execute(text("""
        SELECT
            musteri_id,
            recency_degeri,
            frequency_degeri,
            monetary_degeri,
            r_skoru,
            f_skoru,
            m_skoru
        FROM rfm_analizi
    """)).fetchall()

    if not rows:
        return {
            "processed_customers": 0,
            "message": "Churn için işlenecek müşteri bulunamadı."
        }

    processed = 0
    now = datetime.now()

    for row in rows:
        musteri_id = int(row[0])
        recency = float(row[1] or 0)
        frequency = float(row[2] or 0)
        m_skoru = int(row[6] or 1)

        r_skoru = int(row[4] or 1)
        f_skoru = int(row[5] or 1)

        churn = 0

        if recency > 365:
            churn += 45
        elif recency > 180:
            churn += 35
        elif recency > 90:
            churn += 20
        elif recency > 30:
            churn += 10

        if frequency <= 1:
            churn += 25
        elif frequency <= 3:
            churn += 15
        elif frequency <= 6:
            churn += 8

        if m_skoru <= 2:
            churn += 15
        elif m_skoru == 3:
            churn += 8

        if r_skoru <= 2:
            churn += 10
        if f_skoru <= 2:
            churn += 5

        if churn > 100:
            churn = 100

        db.execute(text("""
            INSERT INTO analitik_tahminler (
                musteri_id,
                churn_olasiligi,
                hesaplama_tarihi
            )
            VALUES (
                :musteri_id,
                :churn_olasiligi,
                :hesaplama_tarihi
            )
            ON DUPLICATE KEY UPDATE
                churn_olasiligi = VALUES(churn_olasiligi),
                hesaplama_tarihi = VALUES(hesaplama_tarihi)
        """), {
            "musteri_id": musteri_id,
            "churn_olasiligi": round(churn, 2),
            "hesaplama_tarihi": now
        })

        processed += 1

    db.commit()

    return {
        "processed_customers": processed,
        "message": "Churn analizi tamamlandı."
    }