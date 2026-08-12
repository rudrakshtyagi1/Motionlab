"""
angles.py — Mathematical utilities for 2D and 3D joint angle calculation in Python.

Used by backend feature extraction and numerical analysis utilities.
Math is kept 100% consistent with frontend/src/services/featureExtractor.ts.
"""

import math
from typing import Tuple, Union

Point = Union[Tuple[float, float], Tuple[float, float, float]]


def calculate_angle(a: Point, b: Point, c: Point) -> float:
    """
    Calculate the interior angle at vertex `b` formed by vectors BA and BC in degrees.

    @param a - First point (x, y) or (x, y, z)
    @param b - Vertex point (x, y) or (x, y, z)
    @param c - Third point (x, y) or (x, y, z)
    @returns Angle in degrees ∈ [0, 180]. Degenerate vectors safely return 0.0 (no NaN).
    """
    # Extract coordinates (support both 2D and 3D)
    ax, ay = a[0], a[1]
    bx, by = b[0], b[1]
    cx, cy = c[0], c[1]

    # Vector BA (b -> a)
    ba_x = ax - bx
    ba_y = ay - by

    # Vector BC (b -> c)
    bc_x = cx - bx
    bc_y = cy - by

    # Magnitudes
    mag_ba = math.hypot(ba_x, ba_y)
    mag_bc = math.hypot(bc_x, bc_y)

    # Handle degenerate vectors safely
    if mag_ba == 0.0 or mag_bc == 0.0:
        return 0.0

    # Dot product
    dot = ba_x * bc_x + ba_y * bc_y

    # Cosine clamped to [-1.0, 1.0] for precision limits
    cos_angle = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))

    # Radians to degrees
    radians = math.acos(cos_angle)
    degrees = math.degrees(radians)

    return round(degrees, 2)


def calculate_torso_inclination(shoulder_center: Point, hip_center: Point) -> float:
    """
    Calculate the torso inclination angle from vertical UP (0, -1) in degrees.

    @param shoulder_center Midpoint of left & right shoulders
    @param hip_center Midpoint of left & right hips
    @returns Torso lean in degrees (0° = upright, >0° = forward lean)
    """
    # Vector from hip to shoulder (points upward)
    v_x = shoulder_center[0] - hip_center[0]
    v_y = shoulder_center[1] - hip_center[1]

    mag_v = math.hypot(v_x, v_y)
    if mag_v == 0.0:
        return 0.0

    # Vertical vector (0, -1) in normalized screen space (Y increases downward)
    # Dot product with (0, -1) is -v_y
    dot = -v_y
    cos_angle = max(-1.0, min(1.0, dot / mag_v))

    return round(math.degrees(math.acos(cos_angle)), 2)
