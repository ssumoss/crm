from evds import evdsAPI
from sqlalchemy import text
import pandas as pd


def fetch_tufe_from_evds(db):
    api_key = "HkprMtNFzH"

    evds = evdsAPI(api_key)

    data = evds.get_data(
        ["TP.FE.OKTG01"],
        startdate="01-01-2020",
        enddate="01-01-2026",
        frequency=5
    )

    if data is None or data.empty:
        raise Exception("EVDS'den veri gelmedi.")

    for _, row in data.iterrows():
        tarih = row["Tarih"]
        endeks = row["TP_FE_OKTG01"]

        if pd.isna(tarih) or pd.isna(endeks):
            continue

        tarih = pd.to_datetime(tarih, dayfirst=True, errors="coerce")
        if pd.isna(tarih):
            continue

        yil = int(tarih.year)
        ay = int(tarih.month)

        db.execute(text("""
            INSERT INTO tufe_endeks (yil, ay, endeks_degeri)
            VALUES (:yil, :ay, :endeks)
            ON DUPLICATE KEY UPDATE
                endeks_degeri = VALUES(endeks_degeri)
        """), {
            "yil": yil,
            "ay": ay,
            "endeks": float(endeks)
        })

    db.commit()

    return len(data)