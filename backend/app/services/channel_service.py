from sqlalchemy import text


def get_channel_summary_service(db):
    row = db.execute(text("""
        SELECT
            COUNT(DISTINCT sn.satis_noktasi_id) AS toplam_satis_noktasi,

            COALESCE(SUM(
                CASE 
                    WHEN st.satis_tipi_adi LIKE '%Online%' 
                    THEN f.fatura_tutari ELSE 0 
                END
            ), 0) AS online_ciro,

            COALESCE(SUM(
                CASE 
                    WHEN st.satis_tipi_adi NOT LIKE '%Online%' 
                    THEN f.fatura_tutari ELSE 0 
                END
            ), 0) AS magaza_ciro

        FROM satis_noktalari sn
        LEFT JOIN satis_tipleri st 
            ON sn.satis_tipi_id = st.satis_tipi_id
        LEFT JOIN faturalar f 
            ON sn.satis_noktasi_id = f.satis_noktasi_id
           AND f.belge_tipi_id = 1
    """)).fetchone()

    best = db.execute(text("""
        SELECT
            sn.satis_noktasi_adi,
            COALESCE(SUM(f.fatura_tutari), 0) AS ciro
        FROM satis_noktalari sn
        LEFT JOIN faturalar f 
            ON sn.satis_noktasi_id = f.satis_noktasi_id
           AND f.belge_tipi_id = 1
        GROUP BY sn.satis_noktasi_id, sn.satis_noktasi_adi
        ORDER BY ciro DESC
        LIMIT 1
    """)).fetchone()

    return {
        "toplam_satis_noktasi": int(row[0] or 0),
        "online_ciro": float(row[1] or 0),
        "magaza_ciro": float(row[2] or 0),
        "en_basarili_satis_noktasi": best[0] if best else "-",
        "en_basarili_satis_noktasi_ciro": float(best[1] or 0) if best else 0
    }


def get_all_channels_service(db):
    rows = db.execute(text("""
        SELECT
            sn.satis_noktasi_id,
            sn.satis_noktasi_adi,
            CASE
                WHEN st.satis_tipi_adi LIKE '%Online%' THEN 'Online'
                ELSE 'Mağaza'
            END AS kanal_tipi,
            COALESCE(s.sehir_adi, 'Online') AS sehir,
            COALESCE(SUM(CASE WHEN f.belge_tipi_id = 1 THEN f.fatura_tutari ELSE 0 END), 0) AS ciro,
            COUNT(CASE WHEN f.belge_tipi_id = 1 THEN 1 END) AS siparis_sayisi,
            COALESCE(AVG(CASE WHEN f.belge_tipi_id = 1 THEN f.fatura_tutari END), 0) AS aov
        FROM satis_noktalari sn
        LEFT JOIN satis_tipleri st 
            ON sn.satis_tipi_id = st.satis_tipi_id
        LEFT JOIN sehirler s 
            ON sn.sehir_id = s.sehir_id
        LEFT JOIN faturalar f 
            ON sn.satis_noktasi_id = f.satis_noktasi_id
        GROUP BY
            sn.satis_noktasi_id,
            sn.satis_noktasi_adi,
            st.satis_tipi_adi,
            s.sehir_adi
        ORDER BY ciro DESC
    """)).fetchall()

    data = []

    max_ciro = max([float(row[4] or 0) for row in rows], default=1)
    max_siparis = max([int(row[5] or 0) for row in rows], default=1)
    max_aov = max([float(row[6] or 0) for row in rows], default=1)

    for row in rows:
        ciro = float(row[4] or 0)
        siparis = int(row[5] or 0)
        aov = float(row[6] or 0)

        ciro_skor = (ciro / max_ciro) * 45 if max_ciro else 0
        siparis_skor = (siparis / max_siparis) * 35 if max_siparis else 0
        aov_skor = (aov / max_aov) * 20 if max_aov else 0

        skor = round(ciro_skor + siparis_skor + aov_skor)

        if skor >= 75:
            durum = "Yüksek"
        elif skor >= 45:
            durum = "Orta"
        else:
            durum = "Düşük"

        data.append({
            "satis_noktasi_id": int(row[0] or 0),
            "satis_noktasi": row[1] or "-",
            "kanal_tipi": row[2] or "-",
            "sehir": row[3] or "-",
            "ciro": ciro,
            "siparis": siparis,
            "aov": aov,
            "performans_skoru": skor,
            "durum": durum
        })

    return data


def get_channel_type_analysis_service(db):
    rows = db.execute(text("""
        SELECT
            CASE
                WHEN st.satis_tipi_adi LIKE '%Online%' THEN 'Online'
                ELSE 'Mağaza'
            END AS kanal_tipi,
            COALESCE(SUM(CASE WHEN f.belge_tipi_id = 1 THEN f.fatura_tutari ELSE 0 END), 0) AS ciro,
            COUNT(CASE WHEN f.belge_tipi_id = 1 THEN 1 END) AS siparis
        FROM satis_noktalari sn
        LEFT JOIN satis_tipleri st 
            ON sn.satis_tipi_id = st.satis_tipi_id
        LEFT JOIN faturalar f 
            ON sn.satis_noktasi_id = f.satis_noktasi_id
        GROUP BY kanal_tipi
        ORDER BY ciro DESC
    """)).fetchall()

    return [
        {
            "kanal_tipi": row[0],
            "ciro": float(row[1] or 0),
            "siparis": int(row[2] or 0)
        }
        for row in rows
    ]


def get_channel_city_analysis_service(db):
    rows = db.execute(text("""
        SELECT
            COALESCE(s.sehir_adi, 'Online') AS sehir,
            COALESCE(SUM(CASE WHEN f.belge_tipi_id = 1 THEN f.fatura_tutari ELSE 0 END), 0) AS ciro,
            COUNT(CASE WHEN f.belge_tipi_id = 1 THEN 1 END) AS siparis
        FROM satis_noktalari sn
        LEFT JOIN sehirler s 
            ON sn.sehir_id = s.sehir_id
        LEFT JOIN faturalar f 
            ON sn.satis_noktasi_id = f.satis_noktasi_id
        GROUP BY s.sehir_id, s.sehir_adi
        ORDER BY ciro DESC
    """)).fetchall()

    return [
        {
            "sehir": row[0] or "-",
            "ciro": float(row[1] or 0),
            "siparis": int(row[2] or 0)
        }
        for row in rows
    ]