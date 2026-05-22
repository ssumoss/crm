from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar

from app.services.product_service import (
    get_products_summary_service,
    get_all_products_service,
    get_top_selling_products_service,
    get_brand_performance_service,
    get_product_bundles_service
)

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)


@router.get("/summary")
def get_products_summary(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    return get_products_summary_service(db)


@router.get("/")
def get_all_products(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    marka: str | None = Query(None),
    performance: str | None = Query(None),
    min_satis: int | None = Query(None),
    max_satis: int | None = Query(None),
    min_ciro: float | None = Query(None),
    max_ciro: float | None = Query(None),
    min_skor: float | None = Query(None),
    max_skor: float | None = Query(None),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    return get_all_products_service(
        db=db,
        page=page,
        limit=limit,
        search=search,
        marka=marka,
        performance=performance,
        min_satis=min_satis,
        max_satis=max_satis,
        min_ciro=min_ciro,
        max_ciro=max_ciro,
        min_skor=min_skor,
        max_skor=max_skor
    )


@router.get("/top-selling")
def get_top_selling_products(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    return get_top_selling_products_service(db)


@router.get("/brand-performance")
def get_brand_performance(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    return get_brand_performance_service(db)


@router.get("/bundles")
def get_product_bundles(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    return get_product_bundles_service(db)