"""
session.py — SQLAlchemy ORM models for WorkoutSession and RepRecordModel.

Architecture Note:
Webcam video is NEVER uploaded or stored on the backend.
Only numerical pose landmarks (if opt-in enabled) and session metadata/analytics are stored.
"""

from datetime import datetime
import json
from typing import Optional, List
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class WorkoutSession(Base):
    """
    WorkoutSession — ORM table for completed exercise analysis sessions.
    """
    __tablename__ = "workout_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    exercise: Mapped[str] = mapped_column(String(32), default="squat", index=True)
    started_at: Mapped[int] = mapped_column(Integer, nullable=False)
    ended_at: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0)

    total_reps: Mapped[int] = mapped_column(Integer, default=0)
    good_reps: Mapped[int] = mapped_column(Integer, default=0)
    warning_reps: Mapped[int] = mapped_column(Integer, default=0)
    poor_reps: Mapped[int] = mapped_column(Integer, default=0)
    form_consistency: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    primary_improvement: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    landmark_data_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationship to completed repetitions
    reps: Mapped[List["RepRecordModel"]] = relationship(
        "RepRecordModel",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="RepRecordModel.rep_number"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "exercise": self.exercise,
            "started_at": self.started_at,
            "ended_at": self.ended_at,
            "duration_seconds": self.duration_seconds,
            "total_reps": self.total_reps,
            "good_reps": self.good_reps,
            "warning_reps": self.warning_reps,
            "poor_reps": self.poor_reps,
            "form_consistency": self.form_consistency,
            "primary_improvement": self.primary_improvement,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "reps": [r.to_dict() for r in self.reps],
            "landmarks_count": len(json.loads(self.landmark_data_json)) if self.landmark_data_json else 0
        }


class RepRecordModel(Base):
    """
    RepRecordModel — ORM table for individual repetition metrics.
    """
    __tablename__ = "rep_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey("workout_sessions.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )
    rep_number: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_ms: Mapped[float] = mapped_column(Float, default=0.0)
    minimum_knee_angle: Mapped[float] = mapped_column(Float, default=180.0)

    depth_status: Mapped[str] = mapped_column(String(16), default="GOOD")
    knee_alignment_status: Mapped[str] = mapped_column(String(16), default="GOOD")
    torso_status: Mapped[str] = mapped_column(String(16), default="GOOD")
    stability_status: Mapped[str] = mapped_column(String(16), default="GOOD")
    overall_status: Mapped[str] = mapped_column(String(16), default="GOOD")
    score: Mapped[int] = mapped_column(Integer, default=100)

    session: Mapped["WorkoutSession"] = relationship("WorkoutSession", back_populates="reps")

    def to_dict(self):
        return {
            "id": self.id,
            "rep_number": self.rep_number,
            "duration_ms": self.duration_ms,
            "minimum_knee_angle": self.minimum_knee_angle,
            "depth_status": self.depth_status,
            "knee_alignment_status": self.knee_alignment_status,
            "torso_status": self.torso_status,
            "stability_status": self.stability_status,
            "overall_status": self.overall_status,
            "score": self.score,
        }
