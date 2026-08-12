"""
feature_extraction.py — Python biomechanical feature extraction module.

Converts landmark dictionaries or LandmarkFrame objects into numerical features:
knee angles, hip angles, torso inclination, knee tracking offset, and symmetry.
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass
from app.analysis.angles import calculate_angle, calculate_torso_inclination


@dataclass
class SquatFeaturesPython:
    timestamp: float
    left_knee_angle: Optional[float]
    right_knee_angle: Optional[float]
    knee_angle: Optional[float]

    left_hip_angle: Optional[float]
    right_hip_angle: Optional[float]
    hip_angle: Optional[float]

    torso_inclination: Optional[float]
    left_knee_ankle_offset: Optional[float]
    right_knee_ankle_offset: Optional[float]
    normalized_knee_offset: Optional[float]
    knee_angle_symmetry: Optional[float]
    is_reliable: bool


def extract_features_from_dict(
    landmarks_dict: Dict[str, Dict[str, float]],
    timestamp: float = 0.0,
    confidence_threshold: float = 0.5
) -> SquatFeaturesPython:
    """
    Extract numerical movement features from a dictionary of landmark points.

    Expected keys:
      left_hip, right_hip, left_knee, right_knee, left_ankle, right_ankle,
      left_shoulder, right_shoulder
    """
    def get_pt(name: str) -> Optional[tuple]:
        if name in landmarks_dict:
            item = landmarks_dict[name]
            vis = item.get("visibility", 1.0)
            if vis >= confidence_threshold:
                return (item["x"], item["y"])
        return None

    l_hip = get_pt("left_hip")
    r_hip = get_pt("right_hip")
    l_knee = get_pt("left_knee")
    r_knee = get_pt("right_knee")
    l_ankle = get_pt("left_ankle")
    r_ankle = get_pt("right_ankle")
    l_shoulder = get_pt("left_shoulder")
    r_shoulder = get_pt("right_shoulder")

    # 1. Knee Angles
    left_knee_angle = calculate_angle(l_hip, l_knee, l_ankle) if (l_hip and l_knee and l_ankle) else None
    right_knee_angle = calculate_angle(r_hip, r_knee, r_ankle) if (r_hip and r_knee and r_ankle) else None

    if left_knee_angle is not None and right_knee_angle is not None:
        knee_angle = round((left_knee_angle + right_knee_angle) / 2.0, 2)
        knee_symmetry = round(abs(left_knee_angle - right_knee_angle), 2)
    else:
        knee_angle = left_knee_angle or right_knee_angle
        knee_symmetry = None

    # 2. Hip Angles
    left_hip_angle = calculate_angle(l_shoulder, l_hip, l_knee) if (l_shoulder and l_hip and l_knee) else None
    right_hip_angle = calculate_angle(r_shoulder, r_hip, r_knee) if (r_shoulder and r_hip and r_knee) else None

    if left_hip_angle is not None and right_hip_angle is not None:
        hip_angle = round((left_hip_angle + right_hip_angle) / 2.0, 2)
    else:
        hip_angle = left_hip_angle or right_hip_angle

    # 3. Torso Inclination
    torso_inclination = None
    if l_shoulder and r_shoulder and l_hip and r_hip:
        shoulder_center = ((l_shoulder[0] + r_shoulder[0]) / 2.0, (l_shoulder[1] + r_shoulder[1]) / 2.0)
        hip_center = ((l_hip[0] + r_hip[0]) / 2.0, (l_hip[1] + r_hip[1]) / 2.0)
        torso_inclination = calculate_torso_inclination(shoulder_center, hip_center)

    # 4. Knee-Ankle Horizontal Offsets
    l_offset = round(abs(l_knee[0] - l_ankle[0]), 4) if (l_knee and l_ankle) else None
    r_offset = round(abs(r_knee[0] - r_ankle[0]), 4) if (r_knee and r_ankle) else None

    hip_width = abs(l_hip[0] - r_hip[0]) if (l_hip and r_hip) else 0.2
    norm_offset = None
    if l_offset is not None or r_offset is not None:
        raw_max = max(l_offset or 0.0, r_offset or 0.0)
        norm_offset = round(raw_max / max(0.05, hip_width), 2)

    is_reliable = (knee_angle is not None) and (torso_inclination is not None)

    return SquatFeaturesPython(
        timestamp=timestamp,
        left_knee_angle=left_knee_angle,
        right_knee_angle=right_knee_angle,
        knee_angle=knee_angle,
        left_hip_angle=left_hip_angle,
        right_hip_angle=right_hip_angle,
        hip_angle=hip_angle,
        torso_inclination=torso_inclination,
        left_knee_ankle_offset=l_offset,
        right_knee_ankle_offset=r_offset,
        normalized_knee_offset=norm_offset,
        knee_angle_symmetry=knee_symmetry,
        is_reliable=is_reliable,
    )
