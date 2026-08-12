"""
main.py — MotionLab FastAPI application entry point.

Architecture decision:
Pose inference runs CLIENT-SIDE in the browser (MediaPipe WASM) so no webcam frames
travel to the backend. The backend handles:

  - Session persistence & analytics (SQLite / PostgreSQL)
  - Opt-in anonymized numerical landmark sequence storage for future ML training
  - Python biomechanical analysis utilities & REST APIs

Startup:
  uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.api import health, sessions

# Initialize database tables on startup if they do not exist
Base.metadata.create_all(bind=engine)

# ── App initialisation ────────────────────────────────────────────────────────

app = FastAPI(
    title="MotionLab API",
    description=(
        "Backend for MotionLab — real-time human movement intelligence. "
        "Handles session storage, analytics, and future ML inference. "
        "Pose estimation runs client-side via MediaPipe WASM."
    ),
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow local frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:5173",
        "http://localhost:5177",   # Alternate Vite port
        "http://127.0.0.1:5177",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")


# ── Root redirect ─────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": "motionlab-backend",
        "docs": "/api/docs",
        "health": "/api/health",
        "sessions": "/api/sessions",
    }
