from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import Kullanicilar, GirisLoglari, Roller
from app.utils.security import verify_password
from app.utils.jwt_handler import create_access_token


def login_user(db: Session, email: str, password: str, ip_adresi: str | None = None):
    user = db.query(Kullanicilar).filter(Kullanicilar.email == email).first()

    if not user:
        log = GirisLoglari(
            kullanici_id=None,
            email=email,
            basarili_mi=False,
            ip_adresi=ip_adresi,
            hata_mesaji="Kullanıcı bulunamadı",
            giris_tarihi=datetime.now()
        )
        db.add(log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email veya şifre hatalı"
        )

    if not user.aktif_mi:
        log = GirisLoglari(
            kullanici_id=user.kullanici_id,
            email=email,
            basarili_mi=False,
            ip_adresi=ip_adresi,
            hata_mesaji="Kullanıcı pasif",
            giris_tarihi=datetime.now()
        )
        db.add(log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kullanıcı hesabı pasif"
        )

    if not verify_password(password, user.sifre_hash):
        log = GirisLoglari(
            kullanici_id=user.kullanici_id,
            email=email,
            basarili_mi=False,
            ip_adresi=ip_adresi,
            hata_mesaji="Şifre hatalı",
            giris_tarihi=datetime.now()
        )
        db.add(log)
        db.commit()

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

    log = GirisLoglari(
        kullanici_id=user.kullanici_id,
        email=email,
        basarili_mi=True,
        ip_adresi=ip_adresi,
        hata_mesaji=None,
        giris_tarihi=datetime.now()
    )

    db.add(log)
    db.commit()
    db.refresh(user)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }