from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar
from app.services.role_service import get_all_roles_service

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("/")
def get_roles(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("rol_yonet"))
):
    return get_all_roles_service(db)