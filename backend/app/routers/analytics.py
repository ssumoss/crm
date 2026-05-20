from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar

from app.services.rfm_service import run_rfm
from app.services.churn_service import run_churn
from app.services.ltv_service import run_ltv

from app.utils.logger import log_to_db

router = APIRouter(tags=["Analytics"])


@router.post("/analytics/rfm/run")
def run_rfm_endpoint(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("rfm_analizi_calistir"))
):
    try:
        result = run_rfm(db)

        log_to_db(
            db=db,
            tablo_adi="rfm_analizi",
            kayit_id=0,
            islem_tipi="RFM_ANALIZI_CALISTIR",
            yeni_deger="RFM analizi çalıştırıldı",
            kullanici=current_user.email
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analytics/churn/run")
def run_churn_endpoint(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("churn_analizi_calistir"))
):
    try:
        result = run_churn(db)

        log_to_db(
            db=db,
            tablo_adi="analitik_tahminler",
            kayit_id=0,
            islem_tipi="CHURN_ANALIZI_CALISTIR",
            yeni_deger="Churn analizi çalıştırıldı",
            kullanici=current_user.email
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analytics/ltv/run")
def run_ltv_endpoint(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("ltv_analizi_calistir"))
):
    try:
        result = run_ltv(db)

        log_to_db(
            db=db,
            tablo_adi="analitik_tahminler",
            kayit_id=0,
            islem_tipi="LTV_ANALIZI_CALISTIR",
            yeni_deger="LTV analizi çalıştırıldı",
            kullanici=current_user.email
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/churn/top-risk")
def get_top_risk_customers(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        rows = db.execute(text("""
            SELECT
                m.musteri_id,
                m.musteri_adi,
                m.musteri_soyadi,
                a.churn_olasiligi
            FROM analitik_tahminler a
            INNER JOIN musteriler m ON a.musteri_id = m.musteri_id
            WHERE a.churn_olasiligi IS NOT NULL
            ORDER BY a.churn_olasiligi DESC
            LIMIT 50
        """)).fetchall()

        return {
            "kayit_sayisi": len(rows),
            "veriler": [
                {
                    "musteri_id": row[0],
                    "musteri_adi": row[1],
                    "musteri_soyadi": row[2],
                    "churn_olasiligi": float(row[3]) if row[3] is not None else 0
                }
                for row in rows
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/ltv/top")
def get_top_ltv_customers(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        rows = db.execute(text("""
            SELECT
                m.musteri_id,
                m.musteri_adi,
                m.musteri_soyadi,
                a.ltv_tahmini,
                a.hesaplama_tarihi
            FROM analitik_tahminler a
            INNER JOIN musteriler m ON a.musteri_id = m.musteri_id
            WHERE a.ltv_tahmini IS NOT NULL
            ORDER BY a.ltv_tahmini DESC
            LIMIT 50
        """)).fetchall()

        return {
            "kayit_sayisi": len(rows),
            "veriler": [
                {
                    "musteri_id": row[0],
                    "musteri_adi": row[1],
                    "musteri_soyadi": row[2],
                    "ltv_tahmini": float(row[3]) if row[3] is not None else 0,
                    "hesaplama_tarihi": str(row[4]) if row[4] is not None else None
                }
                for row in rows
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/analytics/rfm/heatmap")
def get_rfm_heatmap(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    rows = db.execute(text("""
        SELECT 
            r_skoru,
            f_skoru,
            COUNT(*) AS musteri_sayisi
        FROM rfm_analizi
        WHERE r_skoru IS NOT NULL 
          AND f_skoru IS NOT NULL
        GROUP BY r_skoru, f_skoru
        ORDER BY f_skoru DESC, r_skoru ASC
    """)).fetchall()

    return [
        {
            "r_skoru": int(row[0] or 0),
            "f_skoru": int(row[1] or 0),
            "musteri_sayisi": int(row[2] or 0)
        }
        for row in rows
    ]


@router.get("/analytics/rfm/yearly-segments")
def get_rfm_yearly_segments(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    rows = db.execute(text("""
        SELECT 
            msg.yil,
            s.segment_adi,
            COUNT(*) AS musteri_sayisi
        FROM musteri_segment_gecmis msg
        LEFT JOIN segmentler s 
            ON msg.segment_id = s.segment_id
        WHERE msg.yil IN (2023, 2024, 2025)
        GROUP BY msg.yil, s.segment_adi
        ORDER BY msg.yil, musteri_sayisi DESC
    """)).fetchall()

    return [
        {
            "yil": int(row[0]),
            "segment": row[1] or "-",
            "musteri_sayisi": int(row[2] or 0)
        }
        for row in rows
    ]


@router.get("/analytics/rfm/segment-risk-summary")
def get_rfm_segment_risk_summary(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    rows = db.execute(text("""
        SELECT 
            s.segment_adi,
            COUNT(*) AS musteri_sayisi
        FROM rfm_analizi r
        LEFT JOIN segmentler s 
            ON r.segment_id = s.segment_id
        GROUP BY s.segment_adi
    """)).fetchall()

    data = {str(row[0] or "-").lower(): int(row[1] or 0) for row in rows}

    risk = sum(v for k, v in data.items() if "risk" in k)
    kayip = sum(v for k, v in data.items() if "kayıp" in k or "kayip" in k or "uykusunda" in k)
    sampiyon = sum(v for k, v in data.items() if "şampiyon" in k or "sampiyon" in k)
    sadik = sum(v for k, v in data.items() if "sadık" in k or "sadik" in k)

    return {
        "risk_altinda": risk,
        "kayip": kayip,
        "sampiyon": sampiyon,
        "sadik": sadik
    }

@router.get("/analytics/page-summary")
def get_analytics_page_summary(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        row = db.execute(text("""
            SELECT
                COALESCE(AVG(ltv_tahmini), 0) AS ortalama_ltv,
                COALESCE(AVG(churn_olasiligi), 0) AS ortalama_churn,
                COUNT(CASE WHEN ltv_tahmini >= 10000 THEN 1 END) AS degerli_musteri_sayisi,
                COUNT(CASE WHEN churn_olasiligi >= 50 THEN 1 END) AS riskli_musteri_sayisi
            FROM analitik_tahminler
        """)).fetchone()

        aov_row = db.execute(text("""
            SELECT COALESCE(AVG(fatura_tutari), 0)
            FROM faturalar
            WHERE belge_tipi_id = 1
        """)).fetchone()

        return {
            "ortalama_ltv": float(row[0] or 0),
            "ortalama_churn": float(row[1] or 0),
            "ortalama_aov": float(aov_row[0] or 0),
            "degerli_musteri_sayisi": int(row[2] or 0),
            "riskli_musteri_sayisi": int(row[3] or 0)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/ltv-distribution")
def get_ltv_distribution(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        row = db.execute(text("""
            SELECT
                COUNT(CASE WHEN ltv_tahmini >= 0 AND ltv_tahmini < 2000 THEN 1 END) AS r1,
                COUNT(CASE WHEN ltv_tahmini >= 2000 AND ltv_tahmini < 5000 THEN 1 END) AS r2,
                COUNT(CASE WHEN ltv_tahmini >= 5000 AND ltv_tahmini < 10000 THEN 1 END) AS r3,
                COUNT(CASE WHEN ltv_tahmini >= 10000 AND ltv_tahmini < 20000 THEN 1 END) AS r4,
                COUNT(CASE WHEN ltv_tahmini >= 20000 THEN 1 END) AS r5
            FROM analitik_tahminler
            WHERE ltv_tahmini IS NOT NULL
        """)).fetchone()

        return [
            {"range": "0 - 2K", "count": int(row[0] or 0)},
            {"range": "2K - 5K", "count": int(row[1] or 0)},
            {"range": "5K - 10K", "count": int(row[2] or 0)},
            {"range": "10K - 20K", "count": int(row[3] or 0)},
            {"range": "20K+", "count": int(row[4] or 0)}
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/churn-distribution")
def get_churn_distribution(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        row = db.execute(text("""
            SELECT
                COUNT(CASE WHEN churn_olasiligi < 30 THEN 1 END) AS dusuk,
                COUNT(CASE WHEN churn_olasiligi >= 30 AND churn_olasiligi < 60 THEN 1 END) AS orta,
                COUNT(CASE WHEN churn_olasiligi >= 60 THEN 1 END) AS yuksek
            FROM analitik_tahminler
            WHERE churn_olasiligi IS NOT NULL
        """)).fetchone()

        return {
            "dusuk_risk": int(row[0] or 0),
            "orta_risk": int(row[1] or 0),
            "yuksek_risk": int(row[2] or 0),
            "toplam": int((row[0] or 0) + (row[1] or 0) + (row[2] or 0))
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/aov-trend")
def get_aov_trend(
    year: int = 2025,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        rows = db.execute(text("""
            SELECT
                MONTH(fatura_tarihi) AS ay,
                COALESCE(AVG(fatura_tutari), 0) AS aov
            FROM faturalar
            WHERE belge_tipi_id = 1
              AND YEAR(fatura_tarihi) = :year
            GROUP BY MONTH(fatura_tarihi)
            ORDER BY ay
        """), {"year": year}).fetchall()

        months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]

        data = {int(row[0]): float(row[1] or 0) for row in rows}

        return [
            {
                "month": month,
                "value": round(data.get(i, 0), 2)
            }
            for i, month in enumerate(months, start=1)
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/ltv-churn-comparison")
def get_ltv_churn_comparison(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        rows = db.execute(text("""
            SELECT
                COALESCE(s.segment_adi, 'Segmentsiz') AS segment,
                COALESCE(AVG(a.ltv_tahmini), 0) AS ortalama_ltv,
                COALESCE(AVG(a.churn_olasiligi), 0) AS ortalama_churn
            FROM analitik_tahminler a
            LEFT JOIN rfm_analizi r ON a.musteri_id = r.musteri_id
            LEFT JOIN segmentler s ON r.segment_id = s.segment_id
            GROUP BY s.segment_adi
            ORDER BY ortalama_ltv DESC
            LIMIT 8
        """)).fetchall()

        return [
            {
                "segment": row[0] or "-",
                "ltv": float(row[1] or 0),
                "churn": float(row[2] or 0)
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/analytics/sales-forecast")
def get_sales_forecast(
    year: int = 2025,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        rows = db.execute(text("""
            SELECT
                MONTH(fatura_tarihi) AS ay,
                COALESCE(SUM(fatura_tutari), 0) AS satis_tutari
            FROM faturalar
            WHERE belge_tipi_id = 1
              AND YEAR(fatura_tarihi) = :year
            GROUP BY MONTH(fatura_tarihi)
            ORDER BY ay
        """), {"year": year}).fetchall()

        months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"]
        data = {int(row[0]): float(row[1] or 0) for row in rows}

        result = []

        for i, month in enumerate(months, start=1):
            result.append({
                "ay_no": i,
                "ay": month,
                "satis_tutari": round(data.get(i, 0), 2),
                "tahmin_mi": False
            })

        filled = [item for item in result if item["satis_tutari"] > 0]

        if len(filled) >= 3:
            last_values = [item["satis_tutari"] for item in filled[-3:]]
            avg_growth = 0

            growths = []
            for i in range(1, len(last_values)):
                if last_values[i - 1] > 0:
                    growths.append((last_values[i] - last_values[i - 1]) / last_values[i - 1])

            if growths:
                avg_growth = sum(growths) / len(growths)

            last_month_index = filled[-1]["ay_no"]
            last_value = filled[-1]["satis_tutari"]

            for item in result:
                if item["ay_no"] > last_month_index:
                    last_value = last_value * (1 + avg_growth)
                    item["satis_tutari"] = round(last_value, 2)
                    item["tahmin_mi"] = True

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/cohort-analysis")
def get_cohort_analysis(
    year: int = 2025,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        rows = db.execute(text("""
            WITH ilk_alisveris AS (
                SELECT
                    musteri_id,
                    MIN(fatura_tarihi) AS ilk_fatura_tarihi
                FROM faturalar
                WHERE belge_tipi_id = 1
                  AND musteri_id IS NOT NULL
                GROUP BY musteri_id
            ),
            cohort_base AS (
                SELECT
                    ia.musteri_id,
                    ia.ilk_fatura_tarihi,
                    MONTH(ia.ilk_fatura_tarihi) AS cohort_ayi
                FROM ilk_alisveris ia
                WHERE YEAR(ia.ilk_fatura_tarihi) = :year
            )
            SELECT
                cb.cohort_ayi,
                TIMESTAMPDIFF(MONTH, DATE(cb.ilk_fatura_tarihi), DATE(f.fatura_tarihi)) + 1 AS ay_farki,
                COUNT(DISTINCT cb.musteri_id) AS aktif_musteri
            FROM cohort_base cb
            LEFT JOIN faturalar f
                ON cb.musteri_id = f.musteri_id
               AND f.belge_tipi_id = 1
               AND f.fatura_tarihi >= cb.ilk_fatura_tarihi
            GROUP BY cb.cohort_ayi, ay_farki
            ORDER BY cb.cohort_ayi, ay_farki
        """), {"year": year}).fetchall()

        base_rows = db.execute(text("""
            SELECT
                MONTH(ilk_fatura_tarihi) AS cohort_ayi,
                COUNT(*) AS toplam_musteri
            FROM (
                SELECT
                    musteri_id,
                    MIN(fatura_tarihi) AS ilk_fatura_tarihi
                FROM faturalar
                WHERE belge_tipi_id = 1
                  AND musteri_id IS NOT NULL
                GROUP BY musteri_id
            ) x
            WHERE YEAR(ilk_fatura_tarihi) = :year
            GROUP BY MONTH(ilk_fatura_tarihi)
        """), {"year": year}).fetchall()

        months = [
            "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
            "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
        ]

        base = {int(row[0]): int(row[1] or 0) for row in base_rows}
        matrix = {}

        for row in rows:
            cohort_ayi = int(row[0] or 0)
            ay_farki = int(row[1] or 0)
            aktif = int(row[2] or 0)

            if cohort_ayi <= 0 or ay_farki <= 0 or ay_farki > 5:
                continue

            if cohort_ayi not in matrix:
                matrix[cohort_ayi] = [0, 0, 0, 0, 0]

            toplam = base.get(cohort_ayi, 0)

            if toplam > 0:
                matrix[cohort_ayi][ay_farki - 1] = round((aktif / toplam) * 100)

        result = []

        for ay_no in sorted(base.keys()):
            values = matrix.get(ay_no, [0, 0, 0, 0, 0])

            if values[0] == 0:
                values[0] = 100

            result.append({
                "name": months[ay_no - 1],
                "values": values
            })

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))