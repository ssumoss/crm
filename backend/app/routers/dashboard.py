from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar

from app.services.dashboard_service import (
    get_dashboard_summary_service,
    get_dashboard_years_service,
    get_monthly_sales_service,
    get_city_sales_service,
    get_monthly_aov_service,
    get_monthly_return_rate_service,
    search_dashboard_service
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    try:
        return get_dashboard_summary_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/years")
def get_dashboard_years(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    try:
        return get_dashboard_years_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monthly-sales")
def get_monthly_sales(
    year: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    try:
        return get_monthly_sales_service(db, year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/city-sales")
def get_city_sales(
    year: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    try:
        return get_city_sales_service(db, year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monthly-aov")
def get_monthly_aov(
    year: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    try:
        return get_monthly_aov_service(db, year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monthly-return-rate")
def get_monthly_return_rate(
    year: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    try:
        return get_monthly_return_rate_service(db, year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
def search_dashboard(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    try:
        return search_dashboard_service(db, q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))