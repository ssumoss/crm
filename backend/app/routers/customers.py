from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar

from app.services.customer_service import (
    get_all_customers_service,
    get_customer_detail_service,
    get_customer_analytics_service,
    get_top_customers_service,
    get_risky_customers_service,
    get_customers_by_segment_service,
    get_customer_spending_trend_service,
    get_customer_order_frequency_service,
    get_customer_brand_distribution_service,
    get_customer_segment_history_years_service,
    get_customer_filter_options_service
)

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("/filter-options")
def get_customer_filter_options(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    return get_customer_filter_options_service(db)


@router.get("/")
def get_all_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100000),
    search: str = "",
    segment: str = "all",
    city: str = "all",
    risk: str = "all",
    min_ltv: float = Query(0, ge=0),
    max_ltv: float = Query(0, ge=0),
    min_spending: float = Query(0, ge=0),
    max_spending: float = Query(0, ge=0),
    start_date: str = "",
    end_date: str = "",
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    return get_all_customers_service(
        db,
        current_user,
        page,
        limit,
        search,
        segment,
        city,
        risk,
        min_ltv,
        max_ltv,
        min_spending,
        max_spending,
        start_date,
        end_date
    )


@router.get("/top")
def get_top_customers(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    return get_top_customers_service(db)


@router.get("/risk")
def get_risky_customers(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    return get_risky_customers_service(db)


@router.get("/segment/{segment_id}")
def get_customers_by_segment(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    return get_customers_by_segment_service(db, segment_id)


@router.get("/{musteri_id}/analytics")
def get_customer_analytics(
    musteri_id: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    result = get_customer_analytics_service(db, musteri_id)

    if not result:
        raise HTTPException(status_code=404, detail="Analitik veri bulunamadı")

    return result


@router.get("/{musteri_id}/spending-trend")
def get_customer_spending_trend(
    musteri_id: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    return get_customer_spending_trend_service(db, musteri_id, year)


@router.get("/{musteri_id}/order-frequency")
def get_customer_order_frequency(
    musteri_id: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    return get_customer_order_frequency_service(db, musteri_id, year)


@router.get("/{musteri_id}/brand-distribution")
def get_customer_brand_distribution(
    musteri_id: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    return get_customer_brand_distribution_service(db, musteri_id, year)


@router.get("/{musteri_id}/segment-history-years")
def get_customer_segment_history_years(
    musteri_id: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    return get_customer_segment_history_years_service(db, musteri_id)


@router.get("/{musteri_id}")
def get_customer_detail(
    musteri_id: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_detay_goruntule"))
):
    result = get_customer_detail_service(db, musteri_id, current_user)

    if not result:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")

    return result