from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import Kullanicilar, GirisLoglari, Roller
from app.utils.security import verify_password
from app.utils.jwt_handler import create_access_token


def safe_login_log(db, kullanici_id, email, basarili_mi, ip_adresi, hata_mesaji):
    try:
        log = GirisLoglari(
            kullanici_id=kullanici_id,
            email=email,
            basarili_mi=basarili_mi,
            ip_adresi=ip_adresi,
            hata_mesaji=hata_mesaji,
            giris_tarihi=datetime.now()
        )
        db.add(log)
        db.commit()
    except Exception as e:
        db.rollback()
        print("LOGIN LOG HATASI:", str(e))


def login_user(db: Session, email: str, password: str, ip_adresi: str | None = None):
    user = db.query(Kullanicilar).filter(Kullanicilar.email == email).first()

    if not user:
        safe_login_log(db, None, email, False, ip_adresi, "Kullanıcı bulunamadı")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email veya şifre hatalı"
        )

    if not user.aktif_mi:
        safe_login_log(db, user.kullanici_id, email, False, ip_adresi, "Kullanıcı pasif")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kullanıcı hesabı pasif"
        )

    if not verify_password(password, user.sifre_hash):
        safe_login_log(db, user.kullanici_id, email, False, ip_adresi, "Şifre hatalı")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email veya şifre hatalı"
        )

    rol = db.query(Roller).filter(Roller.rol_id == user.rol_id).first()

    token_data = {
        "sub": str(user.kullanici_id),
        "email": user.email,
        "rol_id": user.rol_id,
        "rol_adi": rol.rol_adi if rol else None
    }

    access_token = create_access_token(token_data)

    safe_login_log(db, user.kullanici_id, email, True, ip_adresi, None)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }