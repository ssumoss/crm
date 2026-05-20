from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar

from app.services.segment_service import get_segments, get_customers_by_segment

router = APIRouter(tags=["Segments"])


@router.get("/segments")
def list_segments(
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("segment_goruntule"))
):
    return get_segments(db)


@router.get("/segments/{segment_id}/customers")
def customers_by_segment(
    segment_id: int,
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("segment_goruntule"))
):
    return get_customers_by_segment(db, segment_id)