"""
test_angles.py — Pytest unit tests for Python angle calculation utilities.

Verifies:
  1. 90-degree perpendicular geometry calculation
  2. 180-degree straight line geometry calculation
  3. 0-degree overlapping vector geometry calculation
  4. Degenerate zero-length vector input handling (safe return 0.0, no NaN)
  5. Torso inclination angle calculation
"""

import math
from app.analysis.angles import calculate_angle, calculate_torso_inclination


def test_90_degree_angle():
    a = (0.0, 0.0)
    b = (0.0, 1.0)
    c = (1.0, 1.0)

    angle = calculate_angle(a, b, c)
    assert abs(angle - 90.0) < 0.1


def test_180_degree_angle():
    a = (0.0, 0.0)
    b = (0.0, 1.0)
    c = (0.0, 2.0)

    angle = calculate_angle(a, b, c)
    assert abs(angle - 180.0) < 0.1


def test_0_degree_angle():
    a = (1.0, 1.0)
    b = (0.0, 0.0)
    c = (2.0, 2.0)

    angle = calculate_angle(a, b, c)
    assert abs(angle - 0.0) < 0.1


def test_degenerate_zero_length_vectors():
    # Vertex and point A are identical
    a = (0.0, 0.0)
    b = (0.0, 0.0)
    c = (1.0, 1.0)

    angle = calculate_angle(a, b, c)
    assert angle == 0.0
    assert not math.isnan(angle)


def test_torso_inclination():
    shoulder_center = (0.5, 0.2)
    hip_center = (0.5, 0.8)

    # Perfectly upright torso (hip to shoulder points straight up (0, -0.6))
    upright = calculate_torso_inclination(shoulder_center, hip_center)
    assert abs(upright - 0.0) < 0.1

    # Leaning forward (shoulder shifted right)
    leaning_shoulder = (0.8, 0.5)
    lean = calculate_torso_inclination(leaning_shoulder, hip_center)
    assert lean > 30.0
