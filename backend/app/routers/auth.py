from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import LoginRequest, TokenResponse
from app.services.auth_service import login_user
from app.dependencies import get_current_user
from app.models import Kullanicilar, Roller, Izinler, RolIzinleri

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else None

    return login_user(
        db=db,
        email=data.email,
        password=data.password,
        ip_adresi=ip
    )


@router.get("/me")
def get_current_user_info(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(get_current_user)
):
    rol = db.query(Roller).filter(
        Roller.rol_id == current_user.rol_id
    ).first()

    izinler = (
        db.query(Izinler.izin_kodu)
        .join(RolIzinleri, RolIzinleri.izin_id == Izinler.izin_id)
        .filter(RolIzinleri.rol_id == current_user.rol_id)
        .all()
    )

    return {
        "kullanici_id": current_user.kullanici_id,
        "ad": current_user.ad,
        "soyad": current_user.soyad,
        "email": current_user.email,
        "rol_id": current_user.rol_id,
        "rol_adi": rol.rol_adi if rol else "user",
        "aktif_mi": current_user.aktif_mi,
        "izinler": [izin[0] for izin in izinler]
    }