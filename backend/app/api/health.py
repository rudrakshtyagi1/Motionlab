"""
health.py — /api/health endpoint.

Simple liveness check for the MotionLab backend.
Used by:
  - Frontend apiClient.ts at startup to confirm the backend is reachable
  - Deployment health checks (Docker, Railway, Render, etc.)
  - pytest smoke tests
"""

from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np

router = APIRouter(tags=["System"])


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    numpy_version: str


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Backend health check",
    description=(
        "Returns OK if the backend is running. "
        "Also confirms NumPy is available (critical for future angle calculations). "
        "Pose inference is NOT performed server-side in the MVP — it runs in the browser."
    ),
)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="motionlab-backend",
        version="0.1.0",
        numpy_version=np.__version__,
    )
