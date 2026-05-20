from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models import Kullanicilar, Roller
from app.schemas import UserCreate
from app.utils.security import hash_password


def get_all_users_service(db: Session):
    rows = db.execute(text("""
        SELECT
            k.kullanici_id,
            k.ad,
            k.soyad,
            k.tel_no,
            k.email,
            k.rol_id,
            k.aktif_mi,
            k.olusturma_tarihi,
            r.rol_adi,
            r.aciklama,
            GROUP_CONCAT(i.izin_kodu SEPARATOR ',') AS izinler
        FROM kullanicilar k
        LEFT JOIN roller r
            ON k.rol_id = r.rol_id
        LEFT JOIN rol_izinleri ri
            ON r.rol_id = ri.rol_id
        LEFT JOIN izinler i
            ON ri.izin_id = i.izin_id
        GROUP BY
            k.kullanici_id,
            k.ad,
            k.soyad,
            k.tel_no,
            k.email,
            k.rol_id,
            k.aktif_mi,
            k.olusturma_tarihi,
            r.rol_adi,
            r.aciklama
        ORDER BY k.kullanici_id ASC
    """)).fetchall()

    result = []

    for row in rows:
        permissions = row[10].split(",") if row[10] else []

        result.append({
            "kullanici_id": row[0],
            "ad": row[1],
            "soyad": row[2],
            "tel_no": row[3],
            "email": row[4],
            "rol_id": row[5],
            "aktif_mi": bool(row[6]),
            "olusturma_tarihi": str(row[7]) if row[7] else None,
            "rol_adi": row[8],
            "rol_aciklama": row[9],
            "izinler": permissions
        })

    return result


def create_user_service(
    db: Session,
    data: UserCreate,
    current_user: Kullanicilar
):
    existing_user = db.query(Kullanicilar).filter(
        Kullanicilar.email == data.email
    ).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")

    role = db.query(Roller).filter(
        Roller.rol_id == data.rol_id
    ).first()

    if not role:
        raise HTTPException(status_code=404, detail="Rol bulunamadı")

    current_role = db.query(Roller).filter(
        Roller.rol_id == current_user.rol_id
    ).first()

    if current_role.rol_adi != "super_admin" and role.rol_adi == "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Sadece sistem yöneticisi, sistem yöneticisi hesabı oluşturabilir"
        )

    new_user = Kullanicilar(
        ad=data.ad,
        soyad=data.soyad,
        tel_no=data.tel_no,
        email=data.email,
        sifre_hash=hash_password(data.password),
        rol_id=data.rol_id,
        aktif_mi=data.aktif_mi,
        olusturma_tarihi=datetime.now()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def update_user_status_service(
    db: Session,
    kullanici_id: int,
    aktif_mi: bool,
    current_user: Kullanicilar
):
    current_role = db.query(Roller).filter(
        Roller.rol_id == current_user.rol_id
    ).first()

    if current_role.rol_adi != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Sadece sistem yöneticisi kullanıcı aktif/pasif yapabilir"
        )

    user = db.query(Kullanicilar).filter(
        Kullanicilar.kullanici_id == kullanici_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    if user.kullanici_id == current_user.kullanici_id:
        raise HTTPException(
            status_code=400,
            detail="Kendi hesabını pasif hale getiremezsin"
        )

    user.aktif_mi = aktif_mi

    db.commit()
    db.refresh(user)

    return {
        "message": "Kullanıcı durumu güncellendi",
        "kullanici_id": user.kullanici_id,
        "aktif_mi": user.aktif_mi
    }