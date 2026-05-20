from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import permission_required
from app.models import Kullanicilar
from app.services.import_service import import_orders
from app.utils.logger import log_to_db

router = APIRouter(
    prefix="/import",
    tags=["Import"]
)


@router.post("/")
async def import_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Kullanicilar = Depends(permission_required("veri_import"))
):
    result = await import_orders(file, db)

    log_to_db(
        db=db,
        tablo_adi="orders_raw",
        kayit_id=0,
        islem_tipi="VERI_IMPORT",
        yeni_deger=f"{file.filename} dosyası içe aktarıldı",
        kullanici=current_user.email
    )

    return result