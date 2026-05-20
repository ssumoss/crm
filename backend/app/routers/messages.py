from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar
from app.schemas import MessageCreate, MessageResponse
from app.services.message_service import (
    get_my_messages_service,
    get_unread_message_count_service,
    send_message_service,
    mark_message_as_read_service
)

router = APIRouter(
    prefix="/messages",
    tags=["Messages"]
)


@router.get("/my", response_model=list[MessageResponse])
def get_my_messages(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    return get_my_messages_service(db, current_user.kullanici_id)


@router.get("/unread-count")
def get_unread_message_count(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    count = get_unread_message_count_service(db, current_user.kullanici_id)
    return {"unread_count": count}


@router.post("/send", response_model=MessageResponse)
def send_message(
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    message = send_message_service(
        db=db,
        gonderen_kullanici_id=current_user.kullanici_id,
        alici_kullanici_id=data.alici_kullanici_id,
        mesaj=data.mesaj
    )

    if not message:
        raise HTTPException(status_code=404, detail="Alıcı kullanıcı bulunamadı.")

    return message


@router.put("/read/{mesaj_id}", response_model=MessageResponse)
def mark_message_as_read(
    mesaj_id: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    message = mark_message_as_read_service(
        db,
        mesaj_id,
        current_user.kullanici_id
    )

    if not message:
        raise HTTPException(status_code=404, detail="Mesaj bulunamadı.")

    return message