"""
test_squat_analyzer.py — Unit tests for backend RuleBasedSquatAnalyzer.
"""

from app.analysis.squat_analyzer import RuleBasedSquatAnalyzer
from app.analysis.feature_extraction import SquatFeaturesPython


def test_rule_based_squat_analyzer_good():
    analyzer = RuleBasedSquatAnalyzer()

    good_features = SquatFeaturesPython(
        timestamp=1000.0,
        left_knee_angle=95.0,
        right_knee_angle=95.0,
        knee_angle=95.0,
        left_hip_angle=95.0,
        right_hip_angle=95.0,
        hip_angle=95.0,
        torso_inclination=15.0,
        left_knee_ankle_offset=0.02,
        right_knee_ankle_offset=0.02,
        normalized_knee_offset=0.1,
        knee_angle_symmetry=0.0,
        is_reliable=True,
    )

    res = analyzer.analyze_features(good_features)
    assert res["overall"] == "GOOD"
    assert res["depth"] == "GOOD"
    assert res["knee_tracking"] == "GOOD"
    assert res["torso_lean"] == "GOOD"


def test_rule_based_squat_analyzer_shallow_depth():
    analyzer = RuleBasedSquatAnalyzer()

    shallow_features = SquatFeaturesPython(
        timestamp=1000.0,
        left_knee_angle=125.0,
        right_knee_angle=125.0,
        knee_angle=125.0,
        left_hip_angle=125.0,
        right_hip_angle=125.0,
        hip_angle=125.0,
        torso_inclination=15.0,
        left_knee_ankle_offset=0.02,
        right_knee_ankle_offset=0.02,
        normalized_knee_offset=0.1,
        knee_angle_symmetry=0.0,
        is_reliable=True,
    )

    res = analyzer.analyze_features(shallow_features)
    assert res["overall"] == "POOR"
    assert res["depth"] == "POOR"
