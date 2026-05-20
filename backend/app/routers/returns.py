from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar

from app.services.return_service import (
    get_all_returns_service,
    get_return_summary_service,
    get_return_monthly_trend_service,
    get_return_product_analysis_service,
    get_return_point_analysis_service
)

router = APIRouter(prefix="/returns", tags=["Returns"])


@router.get("/")
def get_all_returns(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_all_returns_service(db, limit, offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def get_all_returns_no_slash(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_all_returns_service(db, limit, offset)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
def get_return_summary(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_return_summary_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monthly-trend")
def get_return_monthly_trend(
    year: int = Query(2025),
    satis_noktasi: str = Query("all"),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_return_monthly_trend_service(db, year, satis_noktasi)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product-analysis")
def get_return_product_analysis(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_return_product_analysis_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/point-analysis")
def get_return_point_analysis(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_return_point_analysis_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))