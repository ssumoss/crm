from fastapi import APIRouter, Depends
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
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    return get_all_products_service(db)


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