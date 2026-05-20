from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# =========================
# AUTH SCHEMAS
# =========================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    kullanici_id: int
    ad: str
    soyad: str
    email: EmailStr
    rol_id: int
    aktif_mi: bool

    class Config:
        from_attributes = True


# =========================
# USER SCHEMAS
# =========================

class UserCreate(BaseModel):
    ad: str
    soyad: str
    tel_no: Optional[str] = None
    email: EmailStr
    password: str
    rol_id: int
    aktif_mi: bool = True


class UserUpdate(BaseModel):
    ad: Optional[str] = None
    soyad: Optional[str] = None
    tel_no: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    rol_id: Optional[int] = None
    aktif_mi: Optional[bool] = None


class UserResponse(BaseModel):
    kullanici_id: int
    ad: str
    soyad: str
    tel_no: Optional[str] = None
    email: EmailStr
    rol_id: int
    aktif_mi: bool
    olusturma_tarihi: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================
# ROLE SCHEMAS
# =========================

class RoleCreate(BaseModel):
    rol_adi: str
    aciklama: Optional[str] = None
    aktif_mi: bool = True


class RoleUpdate(BaseModel):
    rol_adi: Optional[str] = None
    aciklama: Optional[str] = None
    aktif_mi: Optional[bool] = None


class RoleResponse(BaseModel):
    rol_id: int
    rol_adi: str
    aciklama: Optional[str] = None
    aktif_mi: bool
    olusturma_tarihi: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================
# PERMISSION SCHEMAS
# =========================

class PermissionCreate(BaseModel):
    izin_kodu: str
    izin_adi: str
    aciklama: Optional[str] = None
    modul_adi: Optional[str] = None


class PermissionResponse(BaseModel):
    izin_id: int
    izin_kodu: str
    izin_adi: str
    aciklama: Optional[str] = None
    modul_adi: Optional[str] = None

    class Config:
        from_attributes = True


# =========================
# ROLE-PERMISSION SCHEMAS
# =========================

class RolePermissionCreate(BaseModel):
    rol_id: int
    izin_id: int


class RolePermissionResponse(BaseModel):
    rol_izin_id: int
    rol_id: int
    izin_id: int
    olusturma_tarihi: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================
# LOGIN LOG SCHEMAS
# =========================

class LoginLogResponse(BaseModel):
    giris_log_id: int
    kullanici_id: Optional[int] = None
    email: str
    basarili_mi: bool
    ip_adresi: Optional[str] = None
    hata_mesaji: Optional[str] = None
    giris_tarihi: Optional[datetime] = None

    class Config:
        from_attributes = True

# =========================
# NOTIFICATION SCHEMAS
# =========================

class NotificationCreate(BaseModel):
    kullanici_id: int
    baslik: str
    mesaj: str
    tip: Optional[str] = "info"


class NotificationResponse(BaseModel):
    bildirim_id: int
    kullanici_id: int
    baslik: str
    mesaj: str
    tip: Optional[str] = "info"
    okundu_mu: bool
    olusturma_tarihi: Optional[datetime] = None

    class Config:
        from_attributes = True


# =========================
# MESSAGE SCHEMAS
# =========================

class MessageCreate(BaseModel):
    alici_kullanici_id: int
    mesaj: str


class MessageResponse(BaseModel):
    mesaj_id: int
    gonderen_kullanici_id: int
    alici_kullanici_id: int
    mesaj: str
    okundu_mu: bool
    gonderim_tarihi: Optional[datetime] = None
    gonderen_ad_soyad: Optional[str] = None
    alici_ad_soyad: Optional[str] = None

    class Config:
        from_attributes = True