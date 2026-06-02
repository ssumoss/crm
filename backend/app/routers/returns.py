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
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    search: str | None = Query(None),
    satis_noktasi: str | None = Query(None),
    risk: str | None = Query(None),
    year: int | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    min_tutar: float | None = Query(None),
    max_tutar: float | None = Query(None),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_all_returns_service(
            db=db,
            page=page,
            limit=limit,
            search=search,
            satis_noktasi=satis_noktasi,
            risk=risk,
            year=year,
            start_date=start_date,
            end_date=end_date,
            min_tutar=min_tutar,
            max_tutar=max_tutar
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def get_all_returns_no_slash(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    search: str | None = Query(None),
    satis_noktasi: str | None = Query(None),
    risk: str | None = Query(None),
    year: int | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    min_tutar: float | None = Query(None),
    max_tutar: float | None = Query(None),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_all_returns_service(
            db=db,
            page=page,
            limit=limit,
            search=search,
            satis_noktasi=satis_noktasi,
            risk=risk,
            year=year,
            start_date=start_date,
            end_date=end_date,
            min_tutar=min_tutar,
            max_tutar=max_tutar
        )
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