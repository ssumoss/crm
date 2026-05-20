from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar
from app.services.log_service import (
    get_all_logs_service,
    get_logs_summary_service,
    get_audit_logs_service,
    get_login_logs_service
)

router = APIRouter(prefix="/logs", tags=["Logs & Audit"])


@router.get("/")
def get_all_logs(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("audit_log_goruntule"))
):
    return get_all_logs_service(db)


@router.get("/summary")
def get_logs_summary(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("audit_log_goruntule"))
):
    return get_logs_summary_service(db)


@router.get("/audit")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("audit_log_goruntule"))
):
    return get_audit_logs_service(db)


@router.get("/login")
def get_login_logs(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("audit_log_goruntule"))
):
    return get_login_logs_service(db)