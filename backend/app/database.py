import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Render env okumazsa geçici olarak direkt URL'yi kullan
if not DATABASE_URL:
    DATABASE_URL = "mysql+pymysql://root:gBsqYkNiBicgGhxYVioMNPRBpwVrJXkQ@crossover.proxy.rlwy.net:55464/railway"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()