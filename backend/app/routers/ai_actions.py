from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar

from app.services.ai_action_service import (
    get_ai_dashboard_actions_service,
    get_ai_rfm_actions_service,
    get_ai_product_actions_service,
    get_ai_return_actions_service,
    get_ai_analytics_actions_service,
    get_ai_customer360_actions_service
)

router = APIRouter(
    prefix="/ai-actions",
    tags=["AI Actions"]
)


# =========================================================
# DASHBOARD
# =========================================================

@router.get("/dashboard")
def get_ai_dashboard_actions(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    try:
        return get_ai_dashboard_actions_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# RFM
# =========================================================

@router.get("/rfm")
def get_ai_rfm_actions(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    try:
        return get_ai_rfm_actions_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# PRODUCTS
# =========================================================

@router.get("/products")
def get_ai_product_actions(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    try:
        return get_ai_product_actions_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# RETURNS
# =========================================================

@router.get("/returns")
def get_ai_return_actions(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_ai_return_actions_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# ANALYTICS
# =========================================================

@router.get("/analytics")
def get_ai_analytics_actions(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_ai_analytics_actions_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/customer360/{musteri_id}")
def get_ai_customer360_actions(
    musteri_id: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    try:
        return get_ai_customer360_actions_service(db, musteri_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))