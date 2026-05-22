from sqlalchemy import text


def calculate_performance(satis, ciro, max_satis, max_ciro):
    satis_skor = (satis / max_satis) * 50 if max_satis else 0
    ciro_skor = (ciro / max_ciro) * 50 if max_ciro else 0
    performans_skoru = round(satis_skor + ciro_skor, 2)

    if performans_skoru >= 75:
        performans = "Yüksek"
    elif performans_skoru >= 45:
        performans = "Orta"
    else:
        performans = "Düşük"

    return performans_skoru, performans


def get_products_summary_service(db):
    row = db.execute(text("""
        SELECT
            COUNT(DISTINCT u.urun_id) AS toplam_urun,

            (
                SELECT u2.urun_adi
                FROM siparis_detaylari sd2
                INNER JOIN urunler u2 ON sd2.urun_id = u2.urun_id
                INNER JOIN faturalar f2 ON sd2.fatura_no = f2.fatura_no
                WHERE f2.belge_tipi_id = 1
                GROUP BY u2.urun_id, u2.urun_adi
                ORDER BY SUM(sd2.adet) DESC
                LIMIT 1
            ) AS en_cok_satan_urun,

            (
                SELECT COALESCE(SUM(sd3.adet), 0)
                FROM siparis_detaylari sd3
                INNER JOIN urunler u3 ON sd3.urun_id = u3.urun_id
                INNER JOIN faturalar f3 ON sd3.fatura_no = f3.fatura_no
                WHERE f3.belge_tipi_id = 1
                GROUP BY u3.urun_id
                ORDER BY SUM(sd3.adet) DESC
                LIMIT 1
            ) AS en_cok_satis_adedi,

            (
                SELECT u4.urun_adi
                FROM siparis_detaylari sd4
                INNER JOIN urunler u4 ON sd4.urun_id = u4.urun_id
                INNER JOIN faturalar f4 ON sd4.fatura_no = f4.fatura_no
                WHERE f4.belge_tipi_id = 1
                GROUP BY u4.urun_id, u4.urun_adi
                ORDER BY SUM(sd4.satir_toplami) DESC
                LIMIT 1
            ) AS en_yuksek_ciro_urun,

            (
                SELECT COALESCE(SUM(sd5.satir_toplami), 0)
                FROM siparis_detaylari sd5
                INNER JOIN urunler u5 ON sd5.urun_id = u5.urun_id
                INNER JOIN faturalar f5 ON sd5.fatura_no = f5.fatura_no
                WHERE f5.belge_tipi_id = 1
                GROUP BY u5.urun_id
                ORDER BY SUM(sd5.satir_toplami) DESC
                LIMIT 1
            ) AS en_yuksek_ciro,

            (
                SELECT u6.urun_adi
                FROM urunler u6
                LEFT JOIN siparis_detaylari sd6 ON u6.urun_id = sd6.urun_id
                LEFT JOIN faturalar f6 
                    ON sd6.fatura_no = f6.fatura_no 
                    AND f6.belge_tipi_id = 1
                GROUP BY u6.urun_id, u6.urun_adi
                ORDER BY COALESCE(SUM(sd6.adet), 0) ASC
                LIMIT 1
            ) AS en_az_satan_urun,

            (
                SELECT COALESCE(SUM(sd7.adet), 0)
                FROM urunler u7
                LEFT JOIN siparis_detaylari sd7 ON u7.urun_id = sd7.urun_id
                LEFT JOIN faturalar f7 
                    ON sd7.fatura_no = f7.fatura_no 
                    AND f7.belge_tipi_id = 1
                GROUP BY u7.urun_id
                ORDER BY COALESCE(SUM(sd7.adet), 0) ASC
                LIMIT 1
            ) AS en_az_satis_adedi

        FROM urunler u
    """)).fetchone()

    return {
        "toplam_urun": int(row[0] or 0),
        "en_cok_satan_urun": row[1] or "-",
        "en_cok_satis_adedi": int(row[2] or 0),
        "en_yuksek_ciro_urun": row[3] or "-",
        "en_yuksek_ciro": float(row[4] or 0),
        "en_az_satan_urun": row[5] or "-",
        "en_az_satis_adedi": int(row[6] or 0)
    }


def get_all_products_service(
    db,
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
    marka: str | None = None,
    performance: str | None = None,
    min_satis: int | None = None,
    max_satis: int | None = None,
    min_ciro: float | None = None,
    max_ciro: float | None = None,
    min_skor: float | None = None,
    max_skor: float | None = None
):
    where = ["1=1"]
    params = {}

    if search:
        where.append("""
            (
                u.urun_adi LIKE :search
                OR u.urun_kodu LIKE :search
                OR COALESCE(m.marka_adi, '') LIKE :search
            )
        """)
        params["search"] = f"%{search}%"

    if marka and marka != "all":
        where.append("COALESCE(m.marka_adi, '-') = :marka")
        params["marka"] = marka

    where_sql = " AND ".join(where)

    rows = db.execute(text(f"""
        SELECT
            u.urun_id,
            u.urun_kodu,
            u.urun_adi,
            COALESCE(m.marka_adi, '-') AS marka_adi,
            COALESCE(SUM(CASE WHEN f.belge_tipi_id = 1 THEN sd.adet ELSE 0 END), 0) AS toplam_satis_adedi,
            COALESCE(SUM(CASE WHEN f.belge_tipi_id = 1 THEN sd.satir_toplami ELSE 0 END), 0) AS toplam_ciro
        FROM urunler u
        LEFT JOIN markalar m
            ON u.marka_id = m.marka_id
        LEFT JOIN siparis_detaylari sd
            ON u.urun_id = sd.urun_id
        LEFT JOIN faturalar f
            ON sd.fatura_no = f.fatura_no
        WHERE {where_sql}
        GROUP BY
            u.urun_id,
            u.urun_kodu,
            u.urun_adi,
            m.marka_adi
        ORDER BY toplam_ciro DESC
    """), params).fetchall()

    max_satis_value = max([int(r[4] or 0) for r in rows], default=1)
    max_ciro_value = max([float(r[5] or 0) for r in rows], default=1)

    veriler = []

    for r in rows:
        satis = int(r[4] or 0)
        ciro = float(r[5] or 0)

        performans_skoru, performans = calculate_performance(
            satis=satis,
            ciro=ciro,
            max_satis=max_satis_value,
            max_ciro=max_ciro_value
        )

        item = {
            "urun_id": r[0],
            "urun_kodu": r[1],
            "urun_adi": r[2],
            "marka": r[3],
            "toplam_satis_adedi": satis,
            "toplam_ciro": ciro,
            "performans_skoru": performans_skoru,
            "performans": performans
        }

        if performance and performance != "all" and item["performans"] != performance:
            continue

        if min_satis is not None and item["toplam_satis_adedi"] < min_satis:
            continue

        if max_satis is not None and item["toplam_satis_adedi"] > max_satis:
            continue

        if min_ciro is not None and item["toplam_ciro"] < min_ciro:
            continue

        if max_ciro is not None and item["toplam_ciro"] > max_ciro:
            continue

        if min_skor is not None and item["performans_skoru"] < min_skor:
            continue

        if max_skor is not None and item["performans_skoru"] > max_skor:
            continue

        veriler.append(item)

    total_count = len(veriler)
    toplam_sayfa = (total_count + limit - 1) // limit if limit else 1

    offset = (page - 1) * limit
    paginated_data = veriler[offset:offset + limit]

    return {
        "kayit_sayisi": total_count,
        "toplam_kayit": total_count,
        "toplam_sayfa": toplam_sayfa,
        "page": int(page),
        "limit": int(limit),
        "offset": int(offset),
        "veriler": paginated_data
    }


def get_top_selling_products_service(db):
    rows = db.execute(text("""
        SELECT
            u.urun_adi,
            COALESCE(SUM(sd.adet), 0) AS toplam_adet
        FROM siparis_detaylari sd
        INNER JOIN urunler u
            ON sd.urun_id = u.urun_id
        INNER JOIN faturalar f
            ON sd.fatura_no = f.fatura_no
        WHERE f.belge_tipi_id = 1
        GROUP BY u.urun_id, u.urun_adi
        ORDER BY toplam_adet DESC
        LIMIT 10
    """)).fetchall()

    return [
        {
            "urun": r[0],
            "adet": int(r[1] or 0)
        }
        for r in rows
    ]


def get_brand_performance_service(db):
    rows = db.execute(text("""
        SELECT
            COALESCE(m.marka_adi, '-') AS marka,
            COALESCE(SUM(sd.satir_toplami), 0) AS toplam_ciro,
            COALESCE(SUM(sd.adet), 0) AS toplam_satis
        FROM siparis_detaylari sd
        INNER JOIN faturalar f
            ON sd.fatura_no = f.fatura_no
        INNER JOIN urunler u
            ON sd.urun_id = u.urun_id
        LEFT JOIN markalar m
            ON u.marka_id = m.marka_id
        WHERE f.belge_tipi_id = 1
        GROUP BY m.marka_adi
        ORDER BY toplam_ciro DESC
    """)).fetchall()

    return [
        {
            "marka": r[0],
            "toplam_ciro": float(r[1] or 0),
            "toplam_satis": int(r[2] or 0)
        }
        for r in rows
    ]


def get_product_bundles_service(db):
    rows = db.execute(text("""
        SELECT
            u1.urun_adi AS urun_1,
            u2.urun_adi AS urun_2,
            COUNT(DISTINCT sd1.fatura_no) AS birlikte_satis_sayisi
        FROM siparis_detaylari sd1
        INNER JOIN siparis_detaylari sd2
            ON sd1.fatura_no = sd2.fatura_no
            AND sd1.urun_id < sd2.urun_id
        INNER JOIN faturalar f
            ON sd1.fatura_no = f.fatura_no
        INNER JOIN urunler u1
            ON sd1.urun_id = u1.urun_id
        INNER JOIN urunler u2
            ON sd2.urun_id = u2.urun_id
        WHERE f.belge_tipi_id = 1
        GROUP BY u1.urun_id, u1.urun_adi, u2.urun_id, u2.urun_adi
        ORDER BY birlikte_satis_sayisi DESC
        LIMIT 8
    """)).fetchall()

    return [
        {
            "urun_1": r[0],
            "urun_2": r[1],
            "birlikte_satis_sayisi": int(r[2] or 0)
        }
        for r in rows
    ]