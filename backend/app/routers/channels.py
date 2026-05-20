from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar

from app.services.channel_service import (
    get_all_channels_service,
    get_channel_summary_service,
    get_channel_type_analysis_service,
    get_channel_city_analysis_service
)

router = APIRouter(prefix="/channels", tags=["Channels"])


@router.get("/")
def get_all_channels(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_all_channels_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def get_all_channels_no_slash(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_all_channels_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
def get_channel_summary(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_channel_summary_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/type-analysis")
def get_channel_type_analysis(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_channel_type_analysis_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/city-analysis")
def get_channel_city_analysis(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    try:
        return get_channel_city_analysis_service(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))