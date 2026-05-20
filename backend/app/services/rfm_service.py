from datetime import date, datetime
from sqlalchemy import text

SEGMENT_MAP = {}

def add_scores(scores, segment_id):
    for s in scores:
        SEGMENT_MAP[s] = segment_id

add_scores(['555','554','544','545','454','455','445'], 1)
add_scores(['543','444','435','355','354','345','344','335'], 2)
add_scores([
    '553','551','552','541','542','533','532','531','452','451',
    '442','441','431','453','433','432','423','353','352','351',
    '342','341','333','323'
], 3)
add_scores(['512','511','422','421','412','411','311'], 4)
add_scores([
    '525','524','523','522','521','515','514','513',
    '425','424','413','414','415','315','314','313'
], 5)
add_scores(['535','534','443','434','343','334','325','324'], 6)
add_scores(['155','154','144','214','215','115','114','113'], 7)
add_scores(['331','321','312','221','213'], 8)
add_scores([
    '255','254','245','244','253','252','243','242','235','234',
    '225','224','153','152','145','143','142','135','134','133',
    '125','124'
], 9)
add_scores([
    '332','322','231','241','251','233','232','223','222',
    '132','123','122','212','211'
], 10)
add_scores(['111','112','121','131','141','151'], 11)

def get_segment_id(r_score, f_score, m_score):
    code = f"{r_score}{f_score}{m_score}"
    return SEGMENT_MAP.get(code)

def ntile_5(values, higher_is_better=True):
    n = len(values)
    if n == 0:
        return []

    indexed = list(enumerate(values))

    if higher_is_better:
        indexed.sort(key=lambda x: x[1], reverse=True)
    else:
        indexed.sort(key=lambda x: x[1], reverse=False)

    result = [0] * n

    for rank, (original_index, _) in enumerate(indexed):
        tile = int(rank * 5 / n) + 1
        if tile > 5:
            tile = 5
        score = 6 - tile
        result[original_index] = score

    return result

def run_rfm(db):
    target_row = db.execute(text("""
        SELECT yil, ay, endeks_degeri
        FROM tufe_endeks
        ORDER BY yil DESC, ay DESC
        LIMIT 1
    """)).fetchone()

    if not target_row:
        raise Exception("tufe_endeks tablosunda veri yok.")

    target_tufe = float(target_row[2])
    today = date.today()

    rows = db.execute(text("""
        SELECT
            f.musteri_id,
            f.fatura_tarihi,
            f.fatura_tutari,
            t.endeks_degeri AS islem_ayi_tufe
        FROM faturalar f
        JOIN tufe_endeks t
            ON t.yil = YEAR(f.fatura_tarihi)
           AND t.ay = MONTH(f.fatura_tarihi)
        WHERE f.musteri_id IS NOT NULL
    """)).fetchall()

    if not rows:
        return {
            "processed_customers": 0,
            "message": "İşlenecek fatura bulunamadı."
        }

    customers = {}

    for row in rows:
        musteri_id = int(row[0])
        fatura_tarihi = row[1]
        fatura_tutari = float(row[2] or 0)
        islem_ayi_tufe = float(row[3] or 0)

        if islem_ayi_tufe == 0:
            continue

        if isinstance(fatura_tarihi, datetime):
            order_date = fatura_tarihi.date()
        else:
            order_date = fatura_tarihi

        guncel_tutar = fatura_tutari * (target_tufe / islem_ayi_tufe)

        if musteri_id not in customers:
            customers[musteri_id] = {
                "musteri_id": musteri_id,
                "last_order_date": order_date,
                "frequency": 0,
                "monetary": 0.0
            }

        customers[musteri_id]["frequency"] += 1
        customers[musteri_id]["monetary"] += guncel_tutar

        if order_date > customers[musteri_id]["last_order_date"]:
            customers[musteri_id]["last_order_date"] = order_date

    data = []
    for musteri_id, c in customers.items():
        recency = (today - c["last_order_date"]).days
        data.append({
            "musteri_id": musteri_id,
            "recency": recency,
            "frequency": c["frequency"],
            "monetary": round(c["monetary"], 2)
        })

    if not data:
        return {
            "processed_customers": 0,
            "message": "İşlenecek müşteri bulunamadı."
        }

    recency_values = [x["recency"] for x in data]
    frequency_values = [x["frequency"] for x in data]
    monetary_values = [x["monetary"] for x in data]

    r_scores = ntile_5(recency_values, higher_is_better=False)
    f_scores = ntile_5(frequency_values, higher_is_better=True)
    m_scores = ntile_5(monetary_values, higher_is_better=True)

    for i, item in enumerate(data):
        r = r_scores[i]
        f = f_scores[i]
        m = m_scores[i]

        toplam_rfm_skoru = int(f"{r}{f}{m}")
        segment_id = get_segment_id(r, f, m)

        db.execute(text("""
            INSERT INTO rfm_analizi (
                musteri_id,
                recency_degeri,
                frequency_degeri,
                monetary_degeri,
                r_skoru,
                f_skoru,
                m_skoru,
                toplam_rfm_skoru,
                segment_id
            )
            VALUES (
                :musteri_id,
                :recency_degeri,
                :frequency_degeri,
                :monetary_degeri,
                :r_skoru,
                :f_skoru,
                :m_skoru,
                :toplam_rfm_skoru,
                :segment_id
            )
            ON DUPLICATE KEY UPDATE
                recency_degeri = VALUES(recency_degeri),
                frequency_degeri = VALUES(frequency_degeri),
                monetary_degeri = VALUES(monetary_degeri),
                r_skoru = VALUES(r_skoru),
                f_skoru = VALUES(f_skoru),
                m_skoru = VALUES(m_skoru),
                toplam_rfm_skoru = VALUES(toplam_rfm_skoru),
                segment_id = VALUES(segment_id)
        """), {
            "musteri_id": item["musteri_id"],
            "recency_degeri": item["recency"],
            "frequency_degeri": item["frequency"],
            "monetary_degeri": item["monetary"],
            "r_skoru": r,
            "f_skoru": f,
            "m_skoru": m,
            "toplam_rfm_skoru": toplam_rfm_skoru,
            "segment_id": segment_id
        })

    db.commit()

    return {
        "processed_customers": len(data),
        "message": "RFM analizi tamamlandı."
    }