from datetime import datetime
from sqlalchemy.orm import Session

from app.models import Bildirimler


def get_my_notifications_service(db: Session, kullanici_id: int):
    return (
        db.query(Bildirimler)
        .filter(Bildirimler.kullanici_id == kullanici_id)
        .order_by(Bildirimler.olusturma_tarihi.desc())
        .all()
    )


def get_unread_notification_count_service(db: Session, kullanici_id: int):
    return (
        db.query(Bildirimler)
        .filter(
            Bildirimler.kullanici_id == kullanici_id,
            Bildirimler.okundu_mu == False
        )
        .count()
    )


def create_notification_service(db: Session, kullanici_id: int, baslik: str, mesaj: str, tip: str = "info"):
    new_notification = Bildirimler(
        kullanici_id=kullanici_id,
        baslik=baslik,
        mesaj=mesaj,
        tip=tip,
        okundu_mu=False,
        olusturma_tarihi=datetime.now()
    )

    db.add(new_notification)
    db.commit()
    db.refresh(new_notification)

    return new_notification


def mark_notification_as_read_service(db: Session, bildirim_id: int, kullanici_id: int):
    notification = (
        db.query(Bildirimler)
        .filter(
            Bildirimler.bildirim_id == bildirim_id,
            Bildirimler.kullanici_id == kullanici_id
        )
        .first()
    )

    if not notification:
        return None

    notification.okundu_mu = True
    db.commit()
    db.refresh(notification)

    return notification


def mark_all_notifications_as_read_service(db: Session, kullanici_id: int):
    db.query(Bildirimler).filter(
        Bildirimler.kullanici_id == kullanici_id,
        Bildirimler.okundu_mu == False
    ).update({"okundu_mu": True})

    db.commit()

    return {"message": "Tüm bildirimler okundu olarak işaretlendi."}