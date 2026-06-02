from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.services import segment_history_service
from app.dependencies import permission_required
from app.models import Kullanicilar
from app.utils.logger import log_to_db


router = APIRouter(
    prefix="/analytics/segment-history",
    tags=["Segment History"]
)


@router.post("/run")
def run_segment_history(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("segment_gecmisi_calistir"))
):
    try:
        result = segment_history_service.run_segment_history(db)

        log_to_db(
            db=db,
            tablo_adi="musteri_segment_gecmis",
            kayit_id=0,
            islem_tipi="SEGMENT_GECMISI_CALISTIR",
            yeni_deger="Segment geçmişi hesaplandı",
            kullanici=current_user.email
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def get_all_segment_history(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    return segment_history_service.get_all_segment_history(db)


@router.get("/summary")
def get_segment_history_summary(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    return segment_history_service.get_segment_history_summary(db)


@router.get("/{musteri_id}")
def get_customer_segment_history(
    musteri_id: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("musteri_goruntule"))
):
    return segment_history_service.get_customer_segment_history(db, musteri_id)
