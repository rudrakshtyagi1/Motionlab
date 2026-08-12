"""
squat_analyzer.py — Python MovementAnalyzer abstract class and RuleBasedSquatAnalyzer.

Maintains exact behavioral and mathematical consistency with frontend RuleBasedSquatAnalyzer.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from app.analysis.feature_extraction import SquatFeaturesPython


class MovementAnalyzer(ABC):
    """Abstract base class for movement analyzers."""

    @abstractmethod
    def analyze_features(self, features: SquatFeaturesPython) -> Dict[str, Any]:
        pass


class RuleBasedSquatAnalyzer(MovementAnalyzer):
    """
    RuleBasedSquatAnalyzer — Deterministic rule-based squat form analyzer.

    Evaluates:
      - Depth: GOOD (<= 100°), WARNING (101°–115°), POOR (> 115°)
      - Knee Tracking: GOOD (<= 0.25 offset ratio), WARNING (0.26–0.40), POOR (> 0.40)
      - Torso Lean: GOOD (<= 30°), WARNING (31°–45°), POOR (> 45°)
      - Overall Status: POOR if any POOR, WARNING if any WARNING, GOOD if all GOOD
    """

    def __init__(
        self,
        depth_good_max: float = 100.0,
        depth_warning_max: float = 115.0,
        knee_offset_good_max: float = 0.25,
        knee_offset_warning_max: float = 0.40,
        torso_good_max: float = 30.0,
        torso_warning_max: float = 45.0,
    ):
        self.depth_good_max = depth_good_max
        self.depth_warning_max = depth_warning_max
        self.knee_offset_good_max = knee_offset_good_max
        self.knee_offset_warning_max = knee_offset_warning_max
        self.torso_good_max = torso_good_max
        self.torso_warning_max = torso_warning_max

    def evaluate_depth(self, knee_angle: Optional[float]) -> str:
        if knee_angle is None:
            return "UNAVAILABLE"
        if knee_angle <= self.depth_good_max:
            return "GOOD"
        if knee_angle <= self.depth_warning_max:
            return "WARNING"
        return "POOR"

    def evaluate_knee_tracking(self, offset_ratio: Optional[float]) -> str:
        if offset_ratio is None:
            return "UNAVAILABLE"
        if offset_ratio <= self.knee_offset_good_max:
            return "GOOD"
        if offset_ratio <= self.knee_offset_warning_max:
            return "WARNING"
        return "POOR"

    def evaluate_torso_lean(self, torso_angle: Optional[float]) -> str:
        if torso_angle is None:
            return "UNAVAILABLE"
        if torso_angle <= self.torso_good_max:
            return "GOOD"
        if torso_angle <= self.torso_warning_max:
            return "WARNING"
        return "POOR"

    def analyze_features(self, features: SquatFeaturesPython) -> Dict[str, Any]:
        if not features.is_reliable:
            return {
                "overall": "UNAVAILABLE",
                "depth": "UNAVAILABLE",
                "knee_tracking": "UNAVAILABLE",
                "torso_lean": "UNAVAILABLE",
                "primary_message": "Move into full view of camera",
            }

        depth_status = self.evaluate_depth(features.knee_angle)
        knee_status = self.evaluate_knee_tracking(features.normalized_knee_offset)
        torso_status = self.evaluate_torso_lean(features.torso_inclination)

        statuses = [depth_status, knee_status, torso_status]

        if "POOR" in statuses:
            overall = "POOR"
        elif "WARNING" in statuses:
            overall = "WARNING"
        else:
            overall = "GOOD"

        return {
            "overall": overall,
            "depth": depth_status,
            "knee_tracking": knee_status,
            "torso_lean": torso_status,
            "knee_angle": features.knee_angle,
            "torso_inclination": features.torso_inclination,
        }
