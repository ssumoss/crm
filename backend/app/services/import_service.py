import json
from datetime import datetime

import pandas as pd
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.models import Musteriler, Faturalar, SatisNoktalari, BelgeTipi


REQUIRED_COLUMNS = [
    "FATURA_TARIHI",
    "MUSTERI_ADI_SOYADI",
    "MUSTERI_KODU",
    "MUSTERI_MAIL_ADRESI",
    "MUSTERI_GSM_NO",
    "FATURA_TUTARI",
    "FATURA_NUMARASI",
    "SATIS_YERI"
]


def read_uploaded_file(file: UploadFile) -> pd.DataFrame:
    filename = (file.filename or "").lower()

    try:
        if filename.endswith(".csv"):
            return pd.read_csv(file.file)

        elif filename.endswith(".json"):
            content = file.file.read()

            if not content:
                raise HTTPException(status_code=400, detail="JSON dosyası boş.")

            data = json.loads(content)

            if isinstance(data, dict):
                data = [data]

            if not isinstance(data, list):
                raise HTTPException(
                    status_code=400,
                    detail="JSON formatı geçersiz. Liste veya obje olmalıdır."
                )

            return pd.DataFrame(data)

        else:
            raise HTTPException(
                status_code=400,
                detail="Desteklenmeyen dosya formatı. Sadece CSV ve JSON kabul edilir."
            )

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Geçersiz JSON formatı.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Dosya okunamadı: {str(e)}")


def get_or_create_belge_tipi(db: Session):
    belge_tipi = db.query(BelgeTipi).filter(
        BelgeTipi.belge_tipi_adi == "Fatura"
    ).first()

    if not belge_tipi:
        belge_tipi = BelgeTipi(belge_tipi_adi="Fatura")
        db.add(belge_tipi)
        db.flush()

    return belge_tipi


def get_or_create_satis_noktasi(db: Session, satis_yeri: str):
    satis_noktasi = db.query(SatisNoktalari).filter(
        SatisNoktalari.satis_noktasi_adi == satis_yeri
    ).first()

    if not satis_noktasi:
        satis_noktasi = SatisNoktalari(
            satis_noktasi_adi=satis_yeri,
            sehir_id=1,
            satis_tipi_id=1
        )
        db.add(satis_noktasi)
        db.flush()

    return satis_noktasi


def get_or_create_musteri(
    db: Session,
    musteri_kodu: str,
    ad: str,
    soyad: str,
    email: str,
    gsm: str,
    satis_noktasi_id: int
):
    musteri = db.query(Musteriler).filter(
        Musteriler.musteri_kodu == musteri_kodu
    ).first()

    if not musteri:
        musteri = Musteriler(
            musteri_kodu=musteri_kodu,
            musteri_adi=ad,
            musteri_soyadi=soyad,
            mail=email,
            gsm_no=gsm,
            satis_noktasi_id=satis_noktasi_id,
            kayit_tarihi=datetime.now()
        )
        db.add(musteri)
        db.flush()
        return musteri, True

    return musteri, False


async def import_orders(file: UploadFile, db: Session):
    df = read_uploaded_file(file)

    missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Eksik kolonlar: {', '.join(missing_columns)}"
        )

    inserted_customers = 0
    inserted_orders = 0
    skipped_orders = 0
    skipped_rows = 0

    belge_tipi = get_or_create_belge_tipi(db)

    for _, row in df.iterrows():
        musteri_kodu = str(row["MUSTERI_KODU"]).strip()
        fatura_no = str(row["FATURA_NUMARASI"]).strip()

        if not musteri_kodu or musteri_kodu.lower() == "nan":
            skipped_rows += 1
            continue

        if not fatura_no or fatura_no.lower() == "nan":
            skipped_rows += 1
            continue

        ad_soyad = str(row["MUSTERI_ADI_SOYADI"]).strip().split(" ", 1)
        ad = ad_soyad[0] if len(ad_soyad) > 0 else ""
        soyad = ad_soyad[1] if len(ad_soyad) > 1 else ""

        satis_yeri = str(row["SATIS_YERI"]).strip()
        email = str(row["MUSTERI_MAIL_ADRESI"]).strip()
        gsm = str(row["MUSTERI_GSM_NO"]).strip()

        try:
            fatura_tarihi = pd.to_datetime(row["FATURA_TARIHI"])
            fatura_tutari = float(row["FATURA_TUTARI"])
        except Exception:
            skipped_rows += 1
            continue

        existing_invoice = db.query(Faturalar).filter(
            Faturalar.fatura_no == fatura_no
        ).first()

        if existing_invoice:
            skipped_orders += 1
            continue

        satis_noktasi = get_or_create_satis_noktasi(db, satis_yeri)

        musteri, is_new_customer = get_or_create_musteri(
            db=db,
            musteri_kodu=musteri_kodu,
            ad=ad,
            soyad=soyad,
            email=email,
            gsm=gsm,
            satis_noktasi_id=satis_noktasi.satis_noktasi_id
        )

        if is_new_customer:
            inserted_customers += 1

        yeni_fatura = Faturalar(
            fatura_no=fatura_no,
            musteri_id=musteri.musteri_id,
            satis_noktasi_id=satis_noktasi.satis_noktasi_id,
            fatura_tarihi=fatura_tarihi,
            fatura_tutari=fatura_tutari,
            belge_tipi_id=belge_tipi.belge_tipi_id
        )

        db.add(yeni_fatura)
        inserted_orders += 1

    db.commit()

    file_type = "json" if (file.filename or "").lower().endswith(".json") else "csv"

    return {
        "message": "Import tamamlandı",
        "file_type": file_type,
        "inserted_customers": inserted_customers,
        "inserted_orders": inserted_orders,
        "skipped_orders": skipped_orders,
        "skipped_rows": skipped_rows
    }