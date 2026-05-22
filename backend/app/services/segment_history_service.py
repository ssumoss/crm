from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime


SEGMENT_MAP = {
    "Şampiyon": ["555", "554", "544", "545", "454", "455", "445"],
    "Sadık Müşteri": ["543", "444", "435", "355", "354", "345", "344", "335"],
    "Potansiyel Sadık": [
        "553", "551", "552", "541", "542", "533", "532", "531",
        "452", "451", "442", "441", "431", "453", "433", "432",
        "423", "353", "352", "351", "342", "341", "333", "323"
    ],
    "Yeni Müşteri": ["512", "511", "422", "421", "412", "411", "311"],
    "Umut Verici": [
        "525", "524", "523", "522", "521", "515", "514", "513",
        "425", "424", "413", "414", "415", "315", "314", "313"
    ],
    "Dikkat Gerekiyor": ["535", "534", "443", "434", "343", "334", "325", "324"],
    "Onları Kaybedemezsin": ["155", "154", "144", "214", "215", "115", "114", "113"],
    "Uyumak Üzere": ["331", "321", "312", "221", "213"],
    "Risk Altında": [
        "255", "254", "245", "244", "253", "252", "243", "242",
        "235", "234", "225", "224", "153", "152", "145", "143",
        "142", "135", "134", "133", "125", "124"
    ],
    "Kış Uykusunda": [
        "332", "322", "231", "241", "251", "233", "232", "223",
        "222", "132", "123", "122", "212", "211"
    ],
    "Kayıp": ["111", "112", "121", "131", "141", "151"]
}


def find_segment_name(r_score: int, f_score: int, m_score: int) -> str:
    rfm_code = f"{r_score}{f_score}{m_score}"

    for segment_name, codes in SEGMENT_MAP.items():
        if rfm_code in codes:
            return segment_name

    return "Kayıp"


def get_segment_id_by_name(db: Session, segment_name: str):
    result = db.execute(
        text("""
            SELECT segment_id
            FROM segmentler
            WHERE segment_adi = :segment_name
            LIMIT 1
        """),
        {"segment_name": segment_name}
    ).fetchone()

    return result[0] if result else None


def calculate_score(value, values, reverse=False):
    sorted_values = sorted(values)

    if not sorted_values:
        return 1

    n = len(sorted_values)
    position = sorted_values.index(value) + 1
    percentile = position / n

    if reverse:
        if percentile <= 0.20:
            return 5
        elif percentile <= 0.40:
            return 4
        elif percentile <= 0.60:
            return 3
        elif percentile <= 0.80:
            return 2
        else:
            return 1

    if percentile <= 0.20:
        return 1
    elif percentile <= 0.40:
        return 2
    elif percentile <= 0.60:
        return 3
    elif percentile <= 0.80:
        return 4
    else:
        return 5


def run_segment_history(db: Session):
    years = [2023, 2024, 2025]
    inserted_count = 0
    updated_count = 0

    for year in years:
        end_date = f"{year}-12-31"

        rows = db.execute(
            text("""
                SELECT
                    m.musteri_id,
                    DATEDIFF(:end_date, MAX(f.fatura_tarihi)) AS recency_degeri,
                    COUNT(f.fatura_no) AS frequency_degeri,
                    COALESCE(SUM(f.fatura_tutari), 0) AS monetary_degeri
                FROM musteriler m
                JOIN faturalar f ON f.musteri_id = m.musteri_id
                WHERE f.fatura_tarihi <= :end_date
                  AND f.belge_tipi_id = 1
                GROUP BY m.musteri_id
            """),
            {"end_date": end_date}
        ).fetchall()

        if not rows:
            continue

        recency_values = [int(row.recency_degeri or 0) for row in rows]
        frequency_values = [int(row.frequency_degeri or 0) for row in rows]
        monetary_values = [float(row.monetary_degeri or 0) for row in rows]

        for row in rows:
            musteri_id = int(row.musteri_id)
            recency = int(row.recency_degeri or 0)
            frequency = int(row.frequency_degeri or 0)
            monetary = float(row.monetary_degeri or 0)

            r_skoru = calculate_score(recency, recency_values, reverse=True)
            f_skoru = calculate_score(frequency, frequency_values, reverse=False)
            m_skoru = calculate_score(monetary, monetary_values, reverse=False)

            toplam_rfm_skoru = int(f"{r_skoru}{f_skoru}{m_skoru}")

            segment_name = find_segment_name(r_skoru, f_skoru, m_skoru)
            segment_id = get_segment_id_by_name(db, segment_name)

            if segment_id is None:
                continue

            existing = db.execute(
                text("""
                    SELECT gecmis_id
                    FROM musteri_segment_gecmis
                    WHERE musteri_id = :musteri_id
                      AND yil = :yil
                    LIMIT 1
                """),
                {
                    "musteri_id": musteri_id,
                    "yil": year
                }
            ).fetchone()

            if existing:
                db.execute(
                    text("""
                        UPDATE musteri_segment_gecmis
                        SET
                            segment_id = :segment_id,
                            r_skoru = :r_skoru,
                            f_skoru = :f_skoru,
                            m_skoru = :m_skoru,
                            toplam_rfm_skoru = :toplam_rfm_skoru,
                            hesaplama_tarihi = :hesaplama_tarihi
                        WHERE musteri_id = :musteri_id
                          AND yil = :yil
                    """),
                    {
                        "segment_id": segment_id,
                        "r_skoru": r_skoru,
                        "f_skoru": f_skoru,
                        "m_skoru": m_skoru,
                        "toplam_rfm_skoru": toplam_rfm_skoru,
                        "hesaplama_tarihi": datetime.now(),
                        "musteri_id": musteri_id,
                        "yil": year
                    }
                )
                updated_count += 1
            else:
                db.execute(
                    text("""
                        INSERT INTO musteri_segment_gecmis
                        (
                            musteri_id,
                            yil,
                            segment_id,
                            r_skoru,
                            f_skoru,
                            m_skoru,
                            toplam_rfm_skoru,
                            hesaplama_tarihi
                        )
                        VALUES
                        (
                            :musteri_id,
                            :yil,
                            :segment_id,
                            :r_skoru,
                            :f_skoru,
                            :m_skoru,
                            :toplam_rfm_skoru,
                            :hesaplama_tarihi
                        )
                    """),
                    {
                        "musteri_id": musteri_id,
                        "yil": year,
                        "segment_id": segment_id,
                        "r_skoru": r_skoru,
                        "f_skoru": f_skoru,
                        "m_skoru": m_skoru,
                        "toplam_rfm_skoru": toplam_rfm_skoru,
                        "hesaplama_tarihi": datetime.now()
                    }
                )
                inserted_count += 1

    db.commit()

    return {
        "message": "Segment geçmişi başarıyla hesaplandı.",
        "inserted_count": inserted_count,
        "updated_count": updated_count
    }


def get_all_segment_history(
    db: Session,
    search: str = "",
    year: str = "all",
    transition: str = "all",
    old_segment: str = "all",
    new_segment: str = "all",
    min_rfm: int = 0,
    max_rfm: int = 0,
    start_date: str = "",
    end_date: str = ""
):
    conditions = []
    params = {}

    if search:
        conditions.append("""
            (
                LOWER(CONCAT(m.musteri_adi, ' ', m.musteri_soyadi)) LIKE LOWER(:search)
                OR LOWER(s.segment_adi) LIKE LOWER(:search)
                OR CAST(msg.musteri_id AS CHAR) LIKE :search
            )
        """)
        params["search"] = f"%{search}%"

    if year != "all":
        conditions.append("msg.yil = :year")
        params["year"] = int(year)

    if new_segment != "all":
        conditions.append("s.segment_adi = :new_segment")
        params["new_segment"] = new_segment

    if min_rfm > 0:
        conditions.append("COALESCE(msg.toplam_rfm_skoru, 0) >= :min_rfm")
        params["min_rfm"] = min_rfm

    if max_rfm > 0:
        conditions.append("COALESCE(msg.toplam_rfm_skoru, 0) <= :max_rfm")
        params["max_rfm"] = max_rfm

    if start_date:
        conditions.append("DATE(msg.hesaplama_tarihi) >= :start_date")
        params["start_date"] = start_date

    if end_date:
        conditions.append("DATE(msg.hesaplama_tarihi) <= :end_date")
        params["end_date"] = end_date

    where_sql = ""
    if conditions:
        where_sql = "WHERE " + " AND ".join(conditions)

    rows = db.execute(
        text(f"""
            SELECT
                msg.gecmis_id,
                msg.musteri_id,
                CONCAT(m.musteri_adi, ' ', m.musteri_soyadi) AS musteri_ad_soyad,
                msg.yil,
                msg.segment_id,
                s.segment_adi,
                msg.r_skoru,
                msg.f_skoru,
                msg.m_skoru,
                msg.toplam_rfm_skoru,
                msg.hesaplama_tarihi
            FROM musteri_segment_gecmis msg
            LEFT JOIN musteriler m
                ON m.musteri_id = msg.musteri_id
            LEFT JOIN segmentler s
                ON s.segment_id = msg.segment_id
            {where_sql}
            ORDER BY msg.musteri_id, msg.yil
        """),
        params
    ).mappings().all()

    data = [
        {
            "gecmis_id": row["gecmis_id"],
            "musteri_id": row["musteri_id"],
            "musteri_ad_soyad": row["musteri_ad_soyad"] or "-",
            "yil": int(row["yil"] or 0),
            "segment_id": row["segment_id"],
            "segment_adi": row["segment_adi"] or "-",
            "r_skoru": int(row["r_skoru"] or 0),
            "f_skoru": int(row["f_skoru"] or 0),
            "m_skoru": int(row["m_skoru"] or 0),
            "toplam_rfm_skoru": int(row["toplam_rfm_skoru"] or 0),
            "hesaplama_tarihi": str(row["hesaplama_tarihi"]) if row["hesaplama_tarihi"] else None
        }
        for row in rows
    ]

    if transition == "all" and old_segment == "all":
        return data

    grouped = {}

    for row in data:
        musteri_id = row["musteri_id"]

        if musteri_id not in grouped:
            grouped[musteri_id] = []

        grouped[musteri_id].append(row)

    allowed_ids = set()

    for customer_rows in grouped.values():
        sorted_rows = sorted(customer_rows, key=lambda item: item["yil"])

        for i in range(1, len(sorted_rows)):
            previous = sorted_rows[i - 1]
            current = sorted_rows[i]

            previous_segment = previous["segment_adi"]
            current_segment = current["segment_adi"]

            previous_rank = get_segment_rank(previous_segment)
            current_rank = get_segment_rank(current_segment)

            if previous_segment == current_segment:
                transition_type = "Sabit"
            elif current_rank > previous_rank:
                transition_type = "Yükseldi"
            else:
                transition_type = "Düştü"

            transition_match = transition == "all" or transition_type == transition
            old_segment_match = old_segment == "all" or previous_segment == old_segment

            if transition_match and old_segment_match:
                allowed_ids.add(current["gecmis_id"])

    return [
        row for row in data
        if row["gecmis_id"] in allowed_ids
    ]


def get_segment_rank(segment_name: str) -> int:
    segment_rank = {
        "Kayıp": 1,
        "Kış Uykusunda": 2,
        "Uyumak Üzere": 3,
        "Risk Altında": 4,
        "Onları Kaybedemezsin": 5,
        "Dikkat Gerekiyor": 6,
        "Umut Verici": 7,
        "Yeni Müşteri": 8,
        "Potansiyel Sadık": 9,
        "Sadık Müşteri": 10,
        "Şampiyon": 11
    }

    return segment_rank.get(segment_name, 0)


def get_customer_segment_history(db: Session, musteri_id: int):
    rows = db.execute(
        text("""
            SELECT
                msg.gecmis_id,
                msg.musteri_id,
                CONCAT(m.musteri_adi, ' ', m.musteri_soyadi) AS musteri_ad_soyad,
                msg.yil,
                msg.segment_id,
                s.segment_adi,
                msg.r_skoru,
                msg.f_skoru,
                msg.m_skoru,
                msg.toplam_rfm_skoru,
                msg.hesaplama_tarihi
            FROM musteri_segment_gecmis msg
            LEFT JOIN musteriler m
                ON m.musteri_id = msg.musteri_id
            LEFT JOIN segmentler s
                ON s.segment_id = msg.segment_id
            WHERE msg.musteri_id = :musteri_id
            ORDER BY msg.yil
        """),
        {"musteri_id": musteri_id}
    ).mappings().all()

    return [
        {
            "gecmis_id": row["gecmis_id"],
            "musteri_id": row["musteri_id"],
            "musteri_ad_soyad": row["musteri_ad_soyad"] or "-",
            "yil": int(row["yil"] or 0),
            "segment_id": row["segment_id"],
            "segment_adi": row["segment_adi"] or "-",
            "r_skoru": int(row["r_skoru"] or 0),
            "f_skoru": int(row["f_skoru"] or 0),
            "m_skoru": int(row["m_skoru"] or 0),
            "toplam_rfm_skoru": int(row["toplam_rfm_skoru"] or 0),
            "hesaplama_tarihi": str(row["hesaplama_tarihi"]) if row["hesaplama_tarihi"] else None
        }
        for row in rows
    ]


def get_segment_history_summary(db: Session):
    rows = db.execute(
        text("""
            SELECT
                msg.yil,
                s.segment_adi,
                COUNT(*) AS musteri_sayisi
            FROM musteri_segment_gecmis msg
            LEFT JOIN segmentler s
                ON s.segment_id = msg.segment_id
            GROUP BY msg.yil, s.segment_adi
            ORDER BY msg.yil, musteri_sayisi DESC
        """)
    ).mappings().all()

    return [
        {
            "yil": int(row["yil"] or 0),
            "segment_adi": row["segment_adi"] or "-",
            "musteri_sayisi": int(row["musteri_sayisi"] or 0)
        }
        for row in rows
    ]