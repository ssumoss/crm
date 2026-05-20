from datetime import datetime
from sqlalchemy.orm import Session

from app.models import EkipMesajlari, Kullanicilar, Bildirimler


def get_my_messages_service(db: Session, kullanici_id: int):
    messages = (
        db.query(EkipMesajlari)
        .filter(EkipMesajlari.alici_kullanici_id == kullanici_id)
        .order_by(EkipMesajlari.gonderim_tarihi.desc())
        .all()
    )

    result = []

    for message in messages:
        sender = db.query(Kullanicilar).filter(
            Kullanicilar.kullanici_id == message.gonderen_kullanici_id
        ).first()

        receiver = db.query(Kullanicilar).filter(
            Kullanicilar.kullanici_id == message.alici_kullanici_id
        ).first()

        result.append({
            "mesaj_id": message.mesaj_id,
            "gonderen_kullanici_id": message.gonderen_kullanici_id,
            "alici_kullanici_id": message.alici_kullanici_id,
            "mesaj": message.mesaj,
            "okundu_mu": message.okundu_mu,
            "gonderim_tarihi": message.gonderim_tarihi,
            "gonderen_ad_soyad": f"{sender.ad} {sender.soyad}" if sender else "Bilinmeyen Kullanıcı",
            "alici_ad_soyad": f"{receiver.ad} {receiver.soyad}" if receiver else "Bilinmeyen Kullanıcı"
        })

    return result

    for message, sender in messages:
        result.append({
            "mesaj_id": message.mesaj_id,
            "gonderen_kullanici_id": message.gonderen_kullanici_id,
            "alici_kullanici_id": message.alici_kullanici_id,
            "mesaj": message.mesaj,
            "okundu_mu": message.okundu_mu,
            "gonderim_tarihi": message.gonderim_tarihi,
            "gonderen_ad_soyad": f"{sender.ad} {sender.soyad}"
        })

    return result


def get_unread_message_count_service(db: Session, kullanici_id: int):
    return (
        db.query(EkipMesajlari)
        .filter(
            EkipMesajlari.alici_kullanici_id == kullanici_id,
            EkipMesajlari.okundu_mu == False
        )
        .count()
    )


def send_message_service(db: Session, gonderen_kullanici_id: int, alici_kullanici_id: int, mesaj: str):
    alici = (
        db.query(Kullanicilar)
        .filter(Kullanicilar.kullanici_id == alici_kullanici_id)
        .first()
    )

    if not alici:
        return None

    new_message = EkipMesajlari(
        gonderen_kullanici_id=gonderen_kullanici_id,
        alici_kullanici_id=alici_kullanici_id,
        mesaj=mesaj,
        okundu_mu=False,
        gonderim_tarihi=datetime.now()
    )

    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    sender = (
        db.query(Kullanicilar)
        .filter(Kullanicilar.kullanici_id == gonderen_kullanici_id)
        .first()
    )

    sender_name = f"{sender.ad} {sender.soyad}" if sender else "Bir kullanıcı"

    notification = Bildirimler(
        kullanici_id=alici_kullanici_id,
        baslik="Yeni ekip mesajı",
        mesaj=f"{sender_name} sana yeni bir mesaj gönderdi.",
        tip="message",
        okundu_mu=False,
        olusturma_tarihi=datetime.now()
    )

    db.add(notification)
    db.commit()

    return new_message


def mark_message_as_read_service(db: Session, mesaj_id: int, kullanici_id: int):
    message = (
        db.query(EkipMesajlari)
        .filter(
            EkipMesajlari.mesaj_id == mesaj_id,
            EkipMesajlari.alici_kullanici_id == kullanici_id
        )
        .first()
    )

    if not message:
        return None

    message.okundu_mu = True
    db.commit()
    db.refresh(message)

    return message