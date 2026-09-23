from fastapi import FastAPI
from fastapi.security import HTTPBearer

app = FastAPI()

security = HTTPBearer()
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import analytics, auth, materials, subjects
from app.routers import admin
settings.validate()

app = FastAPI(
    title="ScholarShare API",
    version="1.0.0",
    openapi_tags=[],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(materials.router)
app.include_router(analytics.router)
app.include_router(admin.router)

@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}
