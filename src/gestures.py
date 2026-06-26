"""
Ambient Conductor — Gesture Detection
=======================================
Counts extended fingers on the left hand (for stem control) and
extracts right-hand position for FX mapping. Includes a temporal
debounce buffer to prevent flickering finger counts.
"""

from dataclasses import dataclass
from typing import Optional

from config import (
    THUMB_TIP,
    THUMB_IP,
    FINGER_TIPS,
    FINGER_PIPS,
    FINGER_COUNT_DEBOUNCE_FRAMES,
    MIN_CUTOFF_HZ,
    MAX_CUTOFF_HZ,
)
from vision import HandData, HandState


@dataclass
class ConductorState:
    """The high-level musical control state derived from hand gestures."""
    finger_count: int = 0              # 0–5, from left hand
    filter_cutoff_norm: float = 0.5    # 0.0–1.0, from right hand X
    filter_cutoff_hz: float = 3000.0   # Mapped Hz value
    effect_wet_norm: float = 0.0       # 0.0–1.0, from right hand Y
    left_detected: bool = False
    right_detected: bool = False


def count_fingers(landmarks, handedness: str) -> int:
    """
    Count the number of extended fingers on a hand.

    For index, middle, ring, pinky: a finger is extended if
    the fingertip's Y is higher than the PIP joint's Y.
    (Since Y is inverted in our pipeline, higher = larger Y value,
    but landmarks are in raw MediaPipe coords where lower Y = higher
    in the frame. We compare raw landmark coords here.)

    For the thumb: compare tip X vs IP X, accounting for handedness.

    Args:
        landmarks: List of 21 MediaPipe hand landmarks (raw, normalized).
        handedness: "Left" or "Right" (from MediaPipe's perspective,
                    already corrected for mirror flip).

    Returns:
        Integer 0–5 representing the number of raised fingers.
    """
    if not landmarks or len(landmarks) < 21:
        return 0

    count = 0

    # ── Thumb ─────────────────────────────────────────────────────────────
    # Thumb moves laterally, so we compare X coordinates.
    # For a "Left" hand label (user's left hand in mirrored view):
    #   thumb is extended if tip X is to the LEFT of the IP joint.
    # For a "Right" hand label: tip X is to the RIGHT of IP.
    thumb_tip_x = landmarks[THUMB_TIP].x
    thumb_ip_x = landmarks[THUMB_IP].x

    if handedness == "Left":
        # User's left hand: thumb extends leftward (decreasing X in mirrored frame)
        if thumb_tip_x < thumb_ip_x:
            count += 1
    else:
        # User's right hand: thumb extends rightward (increasing X)
        if thumb_tip_x > thumb_ip_x:
            count += 1

    # ── Index, Middle, Ring, Pinky ────────────────────────────────────────
    # A finger is extended when the tip Y is ABOVE (lower value in raw coords)
    # the PIP joint Y.
    for tip_id, pip_id in zip(FINGER_TIPS, FINGER_PIPS):
        if landmarks[tip_id].y < landmarks[pip_id].y:
            count += 1

    return count


class GestureProcessor:
    """
    Processes raw HandState into a debounced ConductorState.
    Maintains a history buffer for finger count stability.
    """

    def __init__(self):
        self._count_history: list[int] = []
        self._stable_count: int = 0

    def _debounce_count(self, raw_count: int) -> int:
        """
        Only update the stable finger count if the same value has
        been seen for FINGER_COUNT_DEBOUNCE_FRAMES consecutive frames.
        This eliminates flicker when fingers are at borderline angles.
        """
        self._count_history.append(raw_count)

        # Keep the buffer trimmed
        if len(self._count_history) > FINGER_COUNT_DEBOUNCE_FRAMES:
            self._count_history = self._count_history[-FINGER_COUNT_DEBOUNCE_FRAMES:]

        # Check if all recent values agree
        if len(self._count_history) >= FINGER_COUNT_DEBOUNCE_FRAMES:
            if all(c == raw_count for c in self._count_history):
                self._stable_count = raw_count

        return self._stable_count

    def _map_cutoff(self, x_norm: float) -> float:
        """
        Map a normalized X coordinate (0.0–1.0) to a filter cutoff
        frequency using an exponential scale.

        Returns Hz in range [MIN_CUTOFF_HZ, MAX_CUTOFF_HZ].
        At x=0.0 → 300 Hz (muffled), at x=1.0 → 20000 Hz (fully open).
        """
        # Exponential mapping: cutoff = MIN * (MAX/MIN)^x
        return MIN_CUTOFF_HZ * (MAX_CUTOFF_HZ / MIN_CUTOFF_HZ) ** x_norm

    def process(self, hand_state: HandState) -> ConductorState:
        """
        Convert a HandState from the vision module into a ConductorState
        for the audio engine.
        """
        state = ConductorState()

        # ── Left hand → finger count (stem control) ──────────────────────
        if hand_state.left is not None:
            state.left_detected = True
            raw_count = count_fingers(
                hand_state.left.landmarks,
                hand_state.left.handedness,
            )
            state.finger_count = self._debounce_count(raw_count)
        else:
            # If left hand disappears, keep the last stable count
            state.finger_count = self._stable_count

        # ── Right hand → filter cutoff (X) and effect wet (Y) ────────────
        if hand_state.right is not None:
            state.right_detected = True
            state.filter_cutoff_norm = hand_state.right.wrist_x
            state.filter_cutoff_hz = self._map_cutoff(hand_state.right.wrist_x)
            state.effect_wet_norm = hand_state.right.wrist_y
        else:
            # Keep defaults (mid cutoff, no effect)
            state.filter_cutoff_norm = 0.5
            state.filter_cutoff_hz = self._map_cutoff(0.5)
            state.effect_wet_norm = 0.0

        return state
