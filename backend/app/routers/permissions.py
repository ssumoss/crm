from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar
from app.services.permission_service import get_all_permissions_service

router = APIRouter(prefix="/permissions", tags=["Permissions"])


@router.get("/")
def get_permissions(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("izin_yonet"))
):
    return get_all_permissions_service(db)