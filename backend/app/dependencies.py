from app.database import SessionLocal

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.models import Kullanicilar, Izinler, RolIzinleri
from app.utils.jwt_handler import decode_access_token


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Token geçersiz veya süresi dolmuş")

    kullanici_id = payload.get("sub")

    if not kullanici_id:
        raise HTTPException(status_code=401, detail="Token içinde kullanıcı bilgisi yok")

    user = db.query(Kullanicilar).filter(
        Kullanicilar.kullanici_id == int(kullanici_id)
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı")

    if not user.aktif_mi:
        raise HTTPException(status_code=403, detail="Kullanıcı pasif")

    return user


def permission_required(izin_kodu: str):
    def checker(
        current_user: Kullanicilar = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        izin = (
            db.query(Izinler)
            .join(RolIzinleri, RolIzinleri.izin_id == Izinler.izin_id)
            .filter(
                RolIzinleri.rol_id == current_user.rol_id,
                Izinler.izin_kodu == izin_kodu
            )
            .first()
        )

        if not izin:
            raise HTTPException(
                status_code=403,
                detail=f"Bu işlem için yetkiniz yok: {izin_kodu}"
            )

        return current_user

    return checker