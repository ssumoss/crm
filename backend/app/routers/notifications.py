from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar
from app.schemas import NotificationCreate, NotificationResponse
from app.services.notification_service import (
    get_my_notifications_service,
    get_unread_notification_count_service,
    create_notification_service,
    mark_notification_as_read_service,
    mark_all_notifications_as_read_service
)

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.get("/my", response_model=list[NotificationResponse])
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    return get_my_notifications_service(db, current_user.kullanici_id)


@router.get("/unread-count")
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    count = get_unread_notification_count_service(db, current_user.kullanici_id)
    return {"unread_count": count}


@router.post("/create", response_model=NotificationResponse)
def create_notification(
    data: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    return create_notification_service(
        db=db,
        kullanici_id=data.kullanici_id,
        baslik=data.baslik,
        mesaj=data.mesaj,
        tip=data.tip
    )


@router.put("/read/{bildirim_id}", response_model=NotificationResponse)
def mark_notification_as_read(
    bildirim_id: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    notification = mark_notification_as_read_service(
        db,
        bildirim_id,
        current_user.kullanici_id
    )

    if not notification:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı.")

    return notification


@router.put("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    return mark_all_notifications_as_read_service(db, current_user.kullanici_id)