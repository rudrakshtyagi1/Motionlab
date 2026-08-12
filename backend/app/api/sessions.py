"""
sessions.py — REST API router for workout session persistence & retrieval.

Endpoints:
  POST /api/sessions       - Submit completed session & reps (201 Created)
  GET  /api/sessions       - List recent workout sessions
  GET  /api/sessions/{id}  - Retrieve specific workout session details
"""

import json
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.session import WorkoutSession, RepRecordModel
from app.models.schemas import SessionCreate, SessionResponse

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a completed workout session",
    description="Persists session metadata, repetition performance records, and optional opt-in anonymized landmark data."
)
@router.post(
    "/",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False
)
def create_session(payload: SessionCreate, db: Session = Depends(get_db)):
    session_id = payload.id or f"session_{uuid.uuid4().hex[:12]}"

    # Check if session ID already exists
    existing = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if existing:
        session_id = f"session_{uuid.uuid4().hex[:12]}"

    duration_seconds = max(0, int((payload.ended_at - payload.started_at) / 1000))

    # Serialize landmarks JSON string if opt-in landmarks provided
    landmarks_json = None
    if payload.landmarks:
        landmarks_json = json.dumps([frame.model_dump() for frame in payload.landmarks])

    db_session = WorkoutSession(
        id=session_id,
        exercise=payload.exercise,
        started_at=payload.started_at,
        ended_at=payload.ended_at,
        duration_seconds=duration_seconds,
        total_reps=payload.total_reps,
        good_reps=payload.good_reps,
        warning_reps=payload.warning_reps,
        poor_reps=payload.poor_reps,
        form_consistency=payload.form_consistency,
        primary_improvement=payload.primary_improvement,
        landmark_data_json=landmarks_json,
    )

    db.add(db_session)
    db.flush()

    # Create associated RepRecordModel instances
    for rep in payload.reps:
        db_rep = RepRecordModel(
            session_id=session_id,
            rep_number=rep.rep_number,
            duration_ms=rep.duration_ms,
            minimum_knee_angle=rep.minimum_knee_angle,
            depth_status=rep.depth_status,
            knee_alignment_status=rep.knee_alignment_status,
            torso_status=rep.torso_status,
            stability_status=rep.stability_status,
            overall_status=rep.overall_status,
            score=rep.score,
        )
        db.add(db_rep)

    db.commit()
    db.refresh(db_session)

    return db_session


@router.get(
    "",
    response_model=List[SessionResponse],
    summary="List recent workout sessions",
    description="Retrieves a list of recent workout sessions sorted by newest first."
)
@router.get(
    "/",
    response_model=List[SessionResponse],
    include_in_schema=False
)
def list_sessions(
    limit: int = Query(default=20, ge=1, le=100, description="Max number of sessions to return"),
    db: Session = Depends(get_db)
):
    sessions = (
        db.query(WorkoutSession)
        .order_by(WorkoutSession.created_at.desc())
        .limit(limit)
        .all()
    )
    return sessions


@router.get(
    "/{session_id}",
    response_model=SessionResponse,
    summary="Get workout session by ID",
    description="Returns detailed information for a specific workout session including rep performance breakdown."
)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found"
        )
    return session
