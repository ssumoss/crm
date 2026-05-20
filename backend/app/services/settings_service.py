from sqlalchemy.orm import Session
from sqlalchemy import text
import json


def get_settings_summary_service(db: Session):
    user_count = db.execute(text("""
        SELECT COUNT(*)
        FROM kullanicilar
        WHERE aktif_mi = 1
    """)).scalar()

    role_count = db.execute(text("""
        SELECT COUNT(*)
        FROM roller
    """)).scalar()

    permission_count = db.execute(text("""
        SELECT COUNT(*)
        FROM izinler
    """)).scalar()

    import_log_count = db.execute(text("""
        SELECT COUNT(*)
        FROM log_kayitlari
        WHERE 
    islem_tipi LIKE '%IMPORT%'
    OR islem_tipi LIKE '%ANALIZ%'
    OR islem_tipi LIKE '%ANALİZ%'
    OR islem_tipi LIKE '%RFM%'
    OR islem_tipi LIKE '%CHURN%'
    OR islem_tipi LIKE '%LTV%'
    OR islem_tipi LIKE '%SEGMENT%'
    """)).scalar()

    return {
        "user_count": user_count or 0,
        "role_count": role_count or 0,
        "permission_count": permission_count or 0,
        "import_log_count": import_log_count or 0
    }


def get_import_logs_service(db: Session):
    rows = db.execute(text("""
        SELECT
            log_id,
            islem_tipi,
            yeni_deger,
            islem_tarihi,
            kullanici
        FROM log_kayitlari
        WHERE 
            islem_tipi LIKE '%IMPORT%'
            OR islem_tipi LIKE '%ANALIZ%'
            OR islem_tipi LIKE '%ANALİZ%'
            OR islem_tipi LIKE '%RFM%'
            OR islem_tipi LIKE '%CHURN%'
            OR islem_tipi LIKE '%LTV%'
            OR islem_tipi LIKE '%SEGMENT%'
        ORDER BY islem_tarihi DESC
        LIMIT 20
    """)).fetchall()

    result = []

    for row in rows:
        result.append({
            "log_id": row[0],
            "type": row[1],
            "detail": row[2],
            "time": str(row[3]) if row[3] else None,
            "user": row[4]
        })

    return result


def get_mask_status_service(db: Session):
    rows = db.execute(text("""
        SELECT ayar_anahtari, ayar_degeri
        FROM sistem_ayarlari
        WHERE ayar_anahtari IN ('phone_mask', 'mail_mask', 'export_mask')
    """)).fetchall()

    settings_dict = {}

    for row in rows:
        settings_dict[row[0]] = str(row[1]).lower() == "true"

    return {
        "phone_mask": settings_dict.get("phone_mask", True),
        "mail_mask": settings_dict.get("mail_mask", True),
        "export_mask": settings_dict.get("export_mask", True),
        "role_based": False,
        "description": "Maskeleme ayarları sistem_ayarlari tablosundan yönetilir."
    }


def update_mask_settings_service(db: Session, settings_data: dict, current_user):
    allowed_keys = ["phone_mask", "mail_mask", "export_mask"]

    for key in allowed_keys:
        if key not in settings_data:
            continue

        value = bool(settings_data[key])

        db.execute(text("""
            UPDATE sistem_ayarlari
            SET
                ayar_degeri = :ayar_degeri,
                guncelleme_tarihi = NOW()
            WHERE ayar_anahtari = :ayar_anahtari
        """), {
            "ayar_anahtari": key,
            "ayar_degeri": str(value).lower()
        })

    db.execute(text("""
        INSERT INTO log_kayitlari
        (
            tablo_adi,
            kayit_id,
            islem_tipi,
            eski_deger,
            yeni_deger,
            islem_tarihi,
            kullanici
        )
        VALUES
        (
            'sistem_ayarlari',
            0,
            'MASKELEME_AYARI_GUNCELLE',
            NULL,
            :yeni_deger,
            NOW(),
            :kullanici
        )
    """), {
        "yeni_deger": json.dumps(settings_data, ensure_ascii=False),
        "kullanici": current_user.email
    })

    db.commit()

    return {
        "message": "Maskeleme ayarları güncellendi",
        "settings": get_mask_status_service(db)
    }


def get_api_status_service(db: Session):
    try:
        db.execute(text("SELECT 1")).scalar()
        db_status = "Aktif"
    except Exception:
        db_status = "Pasif"

    return {
        "dashboard_api": {
            "name": "Dashboard API",
            "description": "KPI ve grafik verileri için kullanılır.",
            "status": db_status
        },
        "import_api": {
            "name": "Import API",
            "description": "CSV ve TÜFE veri aktarımı için kullanılır.",
            "status": db_status
        },
        "analytics_api": {
            "name": "Analitik API",
            "description": "RFM, Churn, LTV ve segment geçmişi işlemleri.",
            "status": db_status
        },
        "export_api": {
            "name": "Export API",
            "description": "Tam veri dışa aktarım servisi.",
            "status": db_status
        }
    }