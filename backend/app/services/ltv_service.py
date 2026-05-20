from datetime import datetime
from sqlalchemy import text


def run_ltv(db):
    rows = db.execute(text("""
        SELECT
            f.musteri_id,
            COUNT(*) AS siparis_sayisi,
            AVG(f.fatura_tutari) AS ortalama_siparis_tutari,
            MIN(f.fatura_tarihi) AS ilk_siparis,
            MAX(f.fatura_tarihi) AS son_siparis
        FROM faturalar f
        WHERE f.musteri_id IS NOT NULL
        GROUP BY f.musteri_id
    """)).fetchall()

    if not rows:
        return {
            "processed_customers": 0,
            "message": "LTV için işlenecek müşteri bulunamadı."
        }

    processed = 0
    now = datetime.now()

    for row in rows:
        musteri_id = int(row[0])
        siparis_sayisi = int(row[1] or 0)
        ortalama_siparis_tutari = float(row[2] or 0)
        ilk_siparis = row[3]
        son_siparis = row[4]

        mevcut = db.execute(text("""
            SELECT churn_olasiligi
            FROM analitik_tahminler
            WHERE musteri_id = :musteri_id
            LIMIT 1
        """), {"musteri_id": musteri_id}).fetchone()

        if not mevcut:
            continue

        churn_olasiligi = float(mevcut[0] or 0)
        churn_rate = churn_olasiligi / 100

        # Churn çok düşükse LTV aşırı şişmesin
        if churn_rate < 0.10:
            churn_rate = 0.10

        # Aktif ay sayısı
        aktif_ay = 1
        if ilk_siparis and son_siparis:
            ay_farki = (son_siparis.year - ilk_siparis.year) * 12 + (son_siparis.month - ilk_siparis.month)
            aktif_ay = max(1, ay_farki + 1)

        aylik_siparis_frekansi = siparis_sayisi / aktif_ay

        # Tahmini müşteri ömrü = 1 / churn_rate
        tahmini_musteri_omru = 1 / churn_rate

        # Daha mantıklı LTV
        ltv_tahmini = ortalama_siparis_tutari * aylik_siparis_frekansi * 12 * tahmini_musteri_omru

        db.execute(text("""
            UPDATE analitik_tahminler
            SET
                ltv_tahmini = :ltv_tahmini,
                hesaplama_tarihi = :hesaplama_tarihi
            WHERE musteri_id = :musteri_id
        """), {
            "musteri_id": musteri_id,
            "ltv_tahmini": round(ltv_tahmini, 2),
            "hesaplama_tarihi": now
        })

        processed += 1

    db.commit()

    return {
        "processed_customers": processed,
        "message": "LTV analizi tamamlandı."
    }