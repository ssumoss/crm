from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar

from app.services.settings_service import (
    get_settings_summary_service,
    get_import_logs_service,
    get_mask_status_service,
    update_mask_settings_service,
    get_api_status_service
)

from app.services.user_service import get_all_users_service

router = APIRouter(
    prefix="/settings",
    tags=["Settings"]
)


@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("kullanici_yonet"))
):
    return get_settings_summary_service(db)


@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("kullanici_yonet"))
):
    return get_all_users_service(db)


@router.get("/import-logs")
def get_import_logs(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("kullanici_yonet"))
):
    return get_import_logs_service(db)


@router.get("/mask-status")
def get_mask_status(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("kullanici_yonet"))
):
    return get_mask_status_service(db)


@router.put("/mask-settings")
def update_mask_settings(
    data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("kullanici_yonet"))
):
    return update_mask_settings_service(
        db=db,
        settings_data=data,
        current_user=current_user
    )


@router.get("/api-status")
def get_api_status(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("kullanici_yonet"))
):
    return get_api_status_service(db)