from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar
from app.schemas import UserCreate, UserResponse
from app.services.user_service import (
    create_user_service,
    get_all_users_service,
    update_user_status_service
)
from app.utils.logger import log_to_db

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/")
def get_users(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("kullanici_yonet"))
):
    return get_all_users_service(db)


@router.get("/message-recipients")
def get_message_recipients(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("dashboard_goruntule"))
):
    users = (
        db.query(Kullanicilar)
        .filter(
            Kullanicilar.aktif_mi == True,
            Kullanicilar.kullanici_id != current_user.kullanici_id
        )
        .order_by(Kullanicilar.ad.asc())
        .all()
    )

    return [
        {
            "kullanici_id": user.kullanici_id,
            "ad": user.ad,
            "soyad": user.soyad,
            "email": user.email
        }
        for user in users
    ]


@router.post("/", response_model=UserResponse)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("kullanici_yonet"))
):
    if data.rol_id == 1 and current_user.rol_id != 1:
        raise HTTPException(
            status_code=403,
            detail="Sistem yöneticisi sadece sistem yöneticisi tarafından oluşturulabilir"
        )

    result = create_user_service(db, data, current_user)

    log_to_db(
        db=db,
        tablo_adi="kullanicilar",
        kayit_id=0,
        islem_tipi="KULLANICI_OLUSTUR",
        yeni_deger=f"{data.email} kullanıcısı oluşturuldu",
        kullanici=current_user.email
    )

    return result


@router.put("/{kullanici_id}/status")
def update_user_status(
    kullanici_id: int,
    aktif_mi: bool,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("kullanici_yonet"))
):
    result = update_user_status_service(
        db=db,
        kullanici_id=kullanici_id,
        aktif_mi=aktif_mi,
        current_user=current_user
    )

    log_to_db(
        db=db,
        tablo_adi="kullanicilar",
        kayit_id=kullanici_id,
        islem_tipi="KULLANICI_DURUM_GUNCELLE",
        yeni_deger=f"aktif_mi={aktif_mi}",
        kullanici=current_user.email
    )

    return result