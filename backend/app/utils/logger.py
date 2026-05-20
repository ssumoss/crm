from datetime import datetime

from app.models import LogKayitlari


def log_to_db(
    db,
    tablo_adi: str,
    islem_tipi: str,
    kayit_id=0,
    eski_deger="-",
    yeni_deger="-",
    kullanici="-"
):
    log = LogKayitlari(
        tablo_adi=tablo_adi,
        kayit_id=str(kayit_id),
        islem_tipi=islem_tipi,
        eski_deger=eski_deger,
        yeni_deger=yeni_deger,
        islem_tarihi=datetime.now(),
        kullanici=kullanici
    )

    db.add(log)
    db.commit()