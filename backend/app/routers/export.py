from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar
from app.services.export_service import get_full_export_service

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("/full")
def export_full_data(
    start_date: str | None = Query(default=None),
    end_date: str | None = Query(default=None),
    segment: str | None = Query(default=None),
    city: str | None = Query(default=None),
    point: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("rapor_export"))
):
    try:
        return get_full_export_service(
            db=db,
            start_date=start_date,
            end_date=end_date,
            segment=segment,
            city=city,
            point=point
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))