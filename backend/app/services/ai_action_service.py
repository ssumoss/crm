import os
import json

from dotenv import load_dotenv

from sqlalchemy.orm import Session
from sqlalchemy import text

from google import genai

from app.services.dashboard_service import get_dashboard_summary_service

from app.services.product_service import (
    get_products_summary_service,
    get_top_selling_products_service,
    get_brand_performance_service,
    get_product_bundles_service
)

from app.services.return_service import (
    get_return_summary_service,
    get_return_monthly_trend_service,
    get_return_product_analysis_service,
    get_return_point_analysis_service,
    get_all_returns_service
)

load_dotenv()


# =========================================================
# GEMINI JSON CLEANER
# =========================================================

def clean_gemini_json_response(text_response):

    text_response = text_response.strip()

    if text_response.startswith("```json"):
        text_response = text_response.replace("```json", "").replace("```", "").strip()

    elif text_response.startswith("```"):
        text_response = text_response.replace("```", "").strip()

    return json.loads(text_response)


# =========================================================
# DASHBOARD
# =========================================================

def fallback_ai_actions(summary):

    genel = summary.get("genel_ozet", {})
    iade = summary.get("iade_ozet", {})
    segment = summary.get("en_buyuk_segment", {})

    riskli = int(genel.get("riskli_musteri_sayisi", 0) or 0)
    iade_orani = float(iade.get("iade_orani", 0) or 0)
    ortalama_churn = float(genel.get("ortalama_churn", 0) or 0)
    top_segment = segment.get("segment_adi") or "Segment verisi yok"

    actions = []

    if riskli > 0:
        actions.append({
            "baslik": "Riskli Müşterilere Geri Kazanım Kampanyası",
            "aciklama": f"{riskli} yüksek churn riskli müşteri için özel indirim veya sadakat kampanyası oluşturulabilir.",
            "oncelik": "Yüksek",
            "ikon": "fa-solid fa-users"
        })

    if iade_orani >= 10:
        actions.append({
            "baslik": "İade Oranı Yüksek Ürünleri İncele",
            "aciklama": f"İade oranı %{round(iade_orani,1)} seviyesinde. İade edilen ürünler analiz edilmeli.",
            "oncelik": "Yüksek",
            "ikon": "fa-solid fa-rotate-left"
        })

    if ortalama_churn >= 50:
        actions.append({
            "baslik": "Churn Riski İçin Takip Sistemi",
            "aciklama": f"Ortalama churn %{round(ortalama_churn,1)} seviyesinde.",
            "oncelik": "Orta",
            "ikon": "fa-solid fa-triangle-exclamation"
        })

    actions.append({
        "baslik": "En Büyük Segment İçin Kampanya",
        "aciklama": f"{top_segment} segmentine özel satış stratejisi oluşturulabilir.",
        "oncelik": "Orta",
        "ikon": "fa-solid fa-chart-pie"
    })

    return actions[:4]


def get_ai_dashboard_actions_service(db: Session):

    summary = get_dashboard_summary_service(db)

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return {
            "source": "fallback",
            "actions": fallback_ai_actions(summary)
        }

    prompt = f"""
Sen profesyonel CRM uzmanısın.

Aşağıdaki dashboard verilerine göre kısa aksiyon önerileri üret.

Veriler:
{json.dumps(summary, ensure_ascii=False, indent=2)}

Kurallar:
- JSON dön
- 4 öneri üret
- Alanlar:
baslik
aciklama
oncelik
ikon
"""

    try:

        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        actions = clean_gemini_json_response(response.text)

        if isinstance(actions, dict) and "actions" in actions:
            actions = actions["actions"]

        return {
            "source": "gemini",
            "actions": actions[:4]
        }

    except Exception:
        return {
            "source": "fallback",
            "actions": fallback_ai_actions(summary)
        }


# =========================================================
# RFM
# =========================================================

def get_ai_rfm_actions_service(db: Session):

    rows = db.execute(text("""
        SELECT
            COALESCE(s.segment_adi, 'Segmentsiz') AS segment,
            COUNT(*) AS toplam
        FROM rfm_analizi r
        LEFT JOIN segmentler s ON r.segment_id = s.segment_id
        GROUP BY s.segment_adi
        ORDER BY toplam DESC
        LIMIT 5
    """)).fetchall()

    segments = [
        {
            "segment": row[0],
            "count": int(row[1] or 0)
        }
        for row in rows
    ]

    actions = []

    if segments:

        top_segment = segments[0]

        actions.append({
            "baslik": "Segment Bazlı Kampanya",
            "aciklama": f"{top_segment['segment']} segmenti için özel kampanya planlanabilir.",
            "oncelik": "Orta",
            "ikon": "fa-solid fa-layer-group"
        })

    actions.append({
        "baslik": "Riskli Segmentleri Takip Et",
        "aciklama": "Düşük frequency ve monetary değerine sahip segmentler için geri kazanım stratejisi uygulanabilir.",
        "oncelik": "Yüksek",
        "ikon": "fa-solid fa-users"
    })

    return {
        "source": "fallback",
        "actions": actions[:4]
    }


# =========================================================
# PRODUCTS
# =========================================================

def get_ai_product_actions_service(db: Session):

    summary = get_products_summary_service(db)
    top_products = get_top_selling_products_service(db)
    brands = get_brand_performance_service(db)
    bundles = get_product_bundles_service(db)

    actions = []

    if top_products:

        top_product = top_products[0]

        actions.append({
            "baslik": "En Çok Satan Ürünü Öne Çıkar",
            "aciklama": f"{top_product['urun']} ürünü yüksek performans gösteriyor.",
            "oncelik": "Orta",
            "ikon": "fa-solid fa-fire"
        })

    if bundles:

        bundle = bundles[0]

        actions.append({
            "baslik": "Birlikte Satılan Ürün Kampanyası",
            "aciklama": f"{bundle['urun_1']} ve {bundle['urun_2']} birlikte kampanyaya alınabilir.",
            "oncelik": "Orta",
            "ikon": "fa-solid fa-boxes-stacked"
        })

    actions.append({
        "baslik": "Düşük Performanslı Ürünleri İncele",
        "aciklama": "Satış performansı düşük ürünler için fiyat veya görünürlük optimizasyonu yapılabilir.",
        "oncelik": "Düşük",
        "ikon": "fa-solid fa-chart-column"
    })

    return {
        "source": "fallback",
        "actions": actions[:4]
    }


# =========================================================
# RETURNS
# =========================================================

def get_returns_summary_for_ai(db: Session):

    summary = get_return_summary_service(db)
    product_analysis = get_return_product_analysis_service(db)
    point_analysis = get_return_point_analysis_service(db)
    monthly_trend = get_return_monthly_trend_service(db, 2025, "all")
    returns_data = get_all_returns_service(db, 20, 0)

    return {
        "summary": summary,
        "top_returned_products": product_analysis[:5],
        "return_points": point_analysis[:5],
        "monthly_trend_2025": monthly_trend,
        "recent_returns": returns_data.get("veriler", [])[:10]
    }


def fallback_ai_return_actions(summary):

    data = summary.get("summary", {})
    products = summary.get("top_returned_products", [])
    points = summary.get("return_points", [])

    actions = []

    iade_orani = float(data.get("iade_orani", 0) or 0)

    if iade_orani >= 5:
        actions.append({
            "baslik": "İade Oranı Takip Edilmeli",
            "aciklama": f"İade oranı %{iade_orani}. Operasyon süreçleri incelenebilir.",
            "oncelik": "Yüksek",
            "ikon": "fa-solid fa-percent"
        })

    if products:

        product = products[0]

        actions.append({
            "baslik": "Riskli Ürünü İncele",
            "aciklama": f"{product['urun']} ürünü sık iade ediliyor.",
            "oncelik": "Orta",
            "ikon": "fa-solid fa-box-open"
        })

    if points:

        point = points[0]

        actions.append({
            "baslik": "Satış Noktası Analizi",
            "aciklama": f"{point['satis_noktasi']} satış noktasında iade yoğunluğu var.",
            "oncelik": "Orta",
            "ikon": "fa-solid fa-store"
        })

    return actions[:4]


def get_ai_return_actions_service(db: Session):

    summary = get_returns_summary_for_ai(db)

    return {
        "source": "fallback",
        "actions": fallback_ai_return_actions(summary)
    }


# =========================================================
# ANALYTICS
# =========================================================

def get_analytics_summary_for_ai(db: Session):

    summary_row = db.execute(text("""
        SELECT
            COALESCE(AVG(ltv_tahmini), 0),
            COALESCE(AVG(churn_olasiligi), 0),
            COUNT(CASE WHEN ltv_tahmini >= 10000 THEN 1 END),
            COUNT(CASE WHEN churn_olasiligi >= 50 THEN 1 END)
        FROM analitik_tahminler
    """)).fetchone()

    return {
        "ortalama_ltv": float(summary_row[0] or 0),
        "ortalama_churn": float(summary_row[1] or 0),
        "degerli_musteri_sayisi": int(summary_row[2] or 0),
        "riskli_musteri_sayisi": int(summary_row[3] or 0)
    }


def fallback_ai_analytics_actions(summary):

    actions = []

    avg_ltv = float(summary.get("ortalama_ltv", 0))
    avg_churn = float(summary.get("ortalama_churn", 0))
    risky = int(summary.get("riskli_musteri_sayisi", 0))
    valuable = int(summary.get("degerli_musteri_sayisi", 0))

    if avg_churn >= 50:
        actions.append({
            "baslik": "Yüksek Churn Riski",
            "aciklama": f"Ortalama churn %{round(avg_churn,1)} seviyesinde.",
            "oncelik": "Yüksek",
            "ikon": "fa-solid fa-triangle-exclamation"
        })

    if valuable > 0:
        actions.append({
            "baslik": "VIP Stratejisi Oluştur",
            "aciklama": f"{valuable} değerli müşteri için sadakat kampanyası uygulanabilir.",
            "oncelik": "Orta",
            "ikon": "fa-solid fa-crown"
        })

    if risky > 0:
        actions.append({
            "baslik": "Riskli Müşterileri Takip Et",
            "aciklama": f"{risky} müşteri risk grubunda.",
            "oncelik": "Yüksek",
            "ikon": "fa-solid fa-users"
        })

    if avg_ltv >= 10000:
        actions.append({
            "baslik": "Premium Deneyim Önerisi",
            "aciklama": f"Ortalama LTV {round(avg_ltv)} seviyesinde.",
            "oncelik": "Düşük",
            "ikon": "fa-solid fa-chart-line"
        })

    return actions[:4]


def get_ai_analytics_actions_service(db: Session):

    summary = get_analytics_summary_for_ai(db)

    return {
        "source": "fallback",
        "actions": fallback_ai_analytics_actions(summary)
    }


def get_ai_customer360_actions_service(db: Session, musteri_id: int):

    customer = db.execute(text("""
        SELECT
            m.musteri_id,
            CONCAT(m.musteri_adi, ' ', m.musteri_soyadi) AS musteri,
            r.recency_degeri,
            r.frequency_degeri,
            r.monetary_degeri,
            r.toplam_rfm_skoru,
            s.segment_adi,
            a.ltv_tahmini,
            a.churn_olasiligi
        FROM musteriler m
        LEFT JOIN rfm_analizi r ON m.musteri_id = r.musteri_id
        LEFT JOIN segmentler s ON r.segment_id = s.segment_id
        LEFT JOIN analitik_tahminler a ON m.musteri_id = a.musteri_id
        WHERE m.musteri_id = :musteri_id
    """), {
        "musteri_id": musteri_id
    }).fetchone()

    if not customer:
        return {
            "source": "fallback",
            "actions": []
        }

    customer_data = {
        "musteri": customer[1],
        "recency": int(customer[2] or 0),
        "frequency": int(customer[3] or 0),
        "monetary": float(customer[4] or 0),
        "rfm_skor": int(customer[5] or 0),
        "segment": customer[6] or "-",
        "ltv": float(customer[7] or 0),
        "churn": float(customer[8] or 0)
    }

    api_key = os.getenv("GEMINI_API_KEY")

    fallback = [
        {
            "baslik": "VIP Müşteri Takibi",
            "aciklama": "Müşteri için özel kampanya ve sadakat avantajı önerilir.",
            "oncelik": "Orta",
            "ikon": "fa-solid fa-crown"
        }
    ]

    if not api_key:
        return {
            "source": "fallback",
            "actions": fallback
        }

    prompt = f"""
Sen profesyonel CRM müşteri analistisin.

Aşağıdaki müşteri verilerini analiz et ve kısa aksiyon önerileri üret.

Veri:
{json.dumps(customer_data, ensure_ascii=False, indent=2)}

Kurallar:
- Sadece JSON dön
- 3 öneri üret
- Alanlar:
baslik
aciklama
oncelik
ikon
- kısa yaz
"""

    try:

        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        actions = clean_gemini_json_response(response.text)

        if isinstance(actions, dict) and "actions" in actions:
            actions = actions["actions"]

        return {
            "source": "gemini",
            "actions": actions[:3]
        }

    except Exception:

        return {
            "source": "fallback",
            "actions": fallback
        }