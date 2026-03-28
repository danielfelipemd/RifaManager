from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="RifaManager API",
    version="1.0.0",
    description="API para gestion de rifas digitales multi-tenant",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register routers
from app.auth.router import router as auth_router  # noqa: E402
from app.tenants.router import router as tenants_router  # noqa: E402
from app.users.router import router as users_router  # noqa: E402
from app.raffles.router import router as raffles_router  # noqa: E402
from app.tickets.router import router as tickets_router  # noqa: E402
from app.purchases.router import router as purchases_router  # noqa: E402
from app.dashboard.router import router as dashboard_router  # noqa: E402

app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(tenants_router, prefix="/api/v1/tenants", tags=["tenants"])
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
app.include_router(raffles_router, prefix="/api/v1/raffles", tags=["raffles"])
app.include_router(tickets_router, prefix="/api/v1", tags=["tickets"])
app.include_router(purchases_router, prefix="/api/v1/purchases", tags=["purchases"])
app.include_router(dashboard_router, prefix="/api/v1/dashboard", tags=["dashboard"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}
