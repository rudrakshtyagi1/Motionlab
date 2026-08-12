"""
test_feature_extraction.py — Unit tests for backend numerical feature extraction.
"""

from app.analysis.feature_extraction import extract_features_from_dict


def test_extract_features_standing_geometry():
    landmarks = {
        "left_shoulder": {"x": 0.4, "y": 0.2, "visibility": 0.95},
        "right_shoulder": {"x": 0.6, "y": 0.2, "visibility": 0.95},
        "left_hip": {"x": 0.4, "y": 0.5, "visibility": 0.95},
        "right_hip": {"x": 0.6, "y": 0.5, "visibility": 0.95},
        "left_knee": {"x": 0.4, "y": 0.75, "visibility": 0.95},
        "right_knee": {"x": 0.6, "y": 0.75, "visibility": 0.95},
        "left_ankle": {"x": 0.4, "y": 0.95, "visibility": 0.95},
        "right_ankle": {"x": 0.6, "y": 0.95, "visibility": 0.95},
    }

    features = extract_features_from_dict(landmarks)

    assert features.is_reliable is True
    assert abs(features.knee_angle - 180.0) < 1.0
    assert abs(features.torso_inclination - 0.0) < 1.0
    assert features.normalized_knee_offset == 0.0
