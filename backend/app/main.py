from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import import_data, customers, dashboard, export, analytics, tufe, auth, users, segment_history, segments, permissions, roles, invoices, products, returns, channels, logs, settings, notifications, messages, ai_actions
# DB oluştur
Base.metadata.create_all(bind=engine)

app = FastAPI(title="CRM & Müşteri Deneyimi Analitik Platformu")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROUTERLAR
app.include_router(import_data.router)
app.include_router(customers.router)
app.include_router(dashboard.router)
app.include_router(export.router)
app.include_router(analytics.router)
app.include_router(tufe.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(segment_history.router)
app.include_router(segments.router)
app.include_router(permissions.router)
app.include_router(roles.router)
app.include_router(invoices.router)
app.include_router(products.router)
app.include_router(returns.router)
app.include_router(channels.router)
app.include_router(logs.router)
app.include_router(settings.router)
app.include_router(notifications.router)
app.include_router(messages.router)
app.include_router(ai_actions.router)