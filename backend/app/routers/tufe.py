from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.tufe_service import fetch_tufe_from_evds

router = APIRouter(tags=["TÜFE"])

@router.post("/import/tufe")
def import_tufe(db: Session = Depends(get_db)):
    try:
        count = fetch_tufe_from_evds(db)
        return {
            "message": "TÜFE verisi çekildi",
            "adet": count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))