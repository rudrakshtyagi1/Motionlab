"""
schemas.py — Pydantic v2 request/response schemas.

Performs strict validation on incoming session analytics payloads and optional pose landmark sequences.
"""

from datetime import datetime
from typing import Optional, List, Union
from pydantic import BaseModel, Field, ConfigDict, field_validator


# ── Landmark Schemas (Opt-In Anonymized Motion Data) ───────────────────────────

class LandmarkPoint(BaseModel):
    name: str = Field(..., description="Anatomical landmark name e.g. left_hip")
    x: float = Field(..., description="Normalized X coordinate in [0, 1]")
    y: float = Field(..., description="Normalized Y coordinate in [0, 1]")
    z: float = Field(default=0.0, description="Estimated depth Z coordinate")
    visibility: float = Field(default=1.0, ge=0.0, le=1.0, description="Detection confidence")


class LandmarkFrame(BaseModel):
    timestamp: float = Field(..., description="Frame timestamp in ms")
    landmarks: List[LandmarkPoint] = Field(default_factory=list)


# ── Repetition Schemas ────────────────────────────────────────────────────────

class RepCreate(BaseModel):
    rep_number: int = Field(..., ge=1, description="1-based repetition index")
    duration_ms: float = Field(..., ge=0.0, description="Rep duration in milliseconds")
    minimum_knee_angle: float = Field(..., ge=0.0, le=180.0, description="Deepest knee angle reached")
    depth_status: str = Field(default="GOOD")
    knee_alignment_status: str = Field(default="GOOD")
    torso_status: str = Field(default="GOOD")
    stability_status: str = Field(default="GOOD")
    overall_status: str = Field(default="GOOD")
    score: int = Field(default=100, ge=0, le=100)


class RepResponse(BaseModel):
    id: int
    rep_number: int
    duration_ms: float
    minimum_knee_angle: float
    depth_status: str
    knee_alignment_status: str
    torso_status: str
    stability_status: str
    overall_status: str
    score: int

    model_config = ConfigDict(from_attributes=True)


# ── Session Schemas ───────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    id: Optional[str] = Field(default=None, description="Client-generated unique session ID")
    exercise: str = Field(default="squat")
    started_at: int = Field(..., ge=0, description="Session start epoch timestamp in ms")
    ended_at: int = Field(..., ge=0, description="Session end epoch timestamp in ms")
    total_reps: int = Field(..., ge=0, description="Total completed reps")
    good_reps: int = Field(default=0, ge=0)
    warning_reps: int = Field(default=0, ge=0)
    poor_reps: int = Field(default=0, ge=0)
    form_consistency: Optional[int] = Field(default=None, ge=0, le=100)
    primary_improvement: Optional[str] = Field(default=None)
    reps: List[RepCreate] = Field(default_factory=list)
    landmarks: Optional[List[LandmarkFrame]] = Field(default=None, description="Opt-in anonymized landmark sequence")

    @field_validator("ended_at")
    @classmethod
    def validate_timestamps(cls, v: int, info) -> int:
        if "started_at" in info.data and v < info.data["started_at"]:
            raise ValueError("ended_at cannot be earlier than started_at")
        return v


class FormBreakdownSchema(BaseModel):
    depth: str = "GOOD"
    kneeAlignment: str = "GOOD"
    torsoLean: str = "GOOD"
    stability: str = "GOOD"


class SessionResponse(BaseModel):
    id: str
    exercise: str
    started_at: int
    ended_at: int
    duration_seconds: int
    total_reps: int
    good_reps: int
    warning_reps: int
    poor_reps: int
    form_consistency: Optional[int] = None
    primary_improvement: Optional[str] = None
    created_at: Optional[Union[datetime, str]] = None
    reps: List[RepResponse] = Field(default_factory=list)
    landmarks_count: int = 0

    model_config = ConfigDict(from_attributes=True)
