from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar
from app.services.invoice_service import (
    get_all_invoices_service,
    get_invoice_summary_service,
    get_invoice_monthly_trend_service,
    get_invoice_basket_analysis_service
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])


@router.get("/")
def get_all_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    search: str | None = Query(None),
    belge_tipi: str | None = Query(None),
    satis_noktasi: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_all_invoices_service(
            db=db,
            page=page,
            limit=limit,
            search=search,
            belge_tipi=belge_tipi,
            satis_noktasi=satis_noktasi
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def get_all_invoices_no_slash(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    search: str | None = Query(None),
    belge_tipi: str | None = Query(None),
    satis_noktasi: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_all_invoices_service(
            db=db,
            page=page,
            limit=limit,
            search=search,
            belge_tipi=belge_tipi,
            satis_noktasi=satis_noktasi
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
def get_invoice_summary(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_invoice_summary_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monthly-trend")
def get_invoice_monthly_trend(
    year: int = Query(2025),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_invoice_monthly_trend_service(db, year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/basket-analysis")
def get_invoice_basket_analysis(
    year: int = Query(2025),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_invoice_basket_analysis_service(db, year)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))