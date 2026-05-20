from sqlalchemy.orm import Session
from app.models import Roller


def get_all_roles_service(db: Session):
    return db.query(Roller).all()