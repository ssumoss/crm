from sqlalchemy.orm import Session
from sqlalchemy import text


def get_audit_logs_service(db: Session):
    rows = db.execute(text("""
        SELECT
            log_id,
            tablo_adi,
            kayit_id,
            islem_tipi,
            eski_deger,
            yeni_deger,
            islem_tarihi,
            kullanici
        FROM log_kayitlari
        ORDER BY islem_tarihi DESC
    """)).fetchall()

    result = []

    for row in rows:
        result.append({
            "id": f"audit-{row[0]}",
            "date": str(row[6]) if row[6] else None,
            "user": row[7] or "System",
            "type": "İşlem",
            "message": f"{row[3]} - {row[1]}",
            "detail": row[5] or row[4] or "-",
            "ip": "-",
            "status": "Başarılı",
            "table": row[1],
            "record_id": row[2],
            "old_value": row[4],
            "new_value": row[5]
        })

    return result


def get_login_logs_service(db: Session):
    rows = db.execute(text("""
        SELECT
            giris_log_id,
            kullanici_id,
            basarili_mi,
            ip_adresi,
            hata_mesaji,
            giris_tarihi,
            email
        FROM giris_loglari
        ORDER BY giris_tarihi DESC
    """)).fetchall()

    result = []

    for row in rows:
        basarili = bool(row[2])

        result.append({
            "id": f"login-{row[0]}",
            "date": str(row[5]) if row[5] else None,
            "user": row[6] or "Bilinmeyen Kullanıcı",
            "type": "Giriş",
            "message": "Sisteme başarılı giriş yaptı" if basarili else row[4] or "Başarısız giriş denemesi",
            "detail": row[4] or "-",
            "ip": row[3] or "-",
            "status": "Başarılı" if basarili else "Başarısız",
            "table": "giris_loglari",
            "record_id": row[0],
            "kullanici_id": row[1]
        })

    return result


def get_all_logs_service(db: Session):
    logs = []
    logs.extend(get_audit_logs_service(db))
    logs.extend(get_login_logs_service(db))

    logs.sort(key=lambda x: x["date"] or "", reverse=True)

    return logs


def get_logs_summary_service(db: Session):
    logs = get_all_logs_service(db)

    today = None
    if logs and logs[0]["date"]:
        today = str(logs[0]["date"])[:10]

    today_login_count = len([
        log for log in logs
        if log["type"] == "Giriş"
        and log["date"]
        and str(log["date"]).startswith(today)
    ]) if today else 0

    failed_login_count = len([
        log for log in logs
        if log["type"] == "Giriş" and log["status"] == "Başarısız"
    ])

    action_count = len([
        log for log in logs
        if log["type"] == "İşlem"
    ])

    error_count = len([
        log for log in logs
        if log["status"] == "Kritik"
        or "HATA" in str(log["message"]).upper()
        or "ERROR" in str(log["message"]).upper()
    ])

    return {
        "today_login_count": today_login_count,
        "failed_login_count": failed_login_count,
        "error_count": error_count,
        "action_count": action_count,
        "total_log_count": len(logs)
    }