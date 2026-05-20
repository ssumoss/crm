from sqlalchemy.orm import Session
from app.models import Izinler


def get_all_permissions_service(db: Session):
    return db.query(Izinler).all()