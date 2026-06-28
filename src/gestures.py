"""
Ambient Conductor — Gesture Detection
=======================================
Counts extended fingers on the active hand (for stem control) and
extracts hand position for FX mapping. Includes a temporal
debounce buffer to prevent flickering finger counts.

Single-hand operation: whichever hand is visible controls both
stem mixing (via finger count) and DSP effects (via wrist position).
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
    finger_count: int = 0              # 0–5, from active hand
    filter_cutoff_norm: float = 0.5    # 0.0–1.0, from hand X position
    filter_cutoff_hz: float = 3000.0   # Mapped Hz value
    filter_mode: str = "bypass"        # "low", "high", "bypass"
    effect_wet_norm: float = 0.0       # 0.0–1.0, from hand Y position
    tempo_factor: float = 1.0          # 0.5–1.7x playback speed factor
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
    Maintains history buffers for finger count stability and tempo tracking.

    Single-hand mode: uses whichever hand is currently tracked
    for all controls (fingers, filter sweep, delay/reverb, tempo).
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

    def process(self, hand_state: HandState) -> ConductorState:
        """
        Convert a HandState from the vision module into a ConductorState
        for the audio engine.

        Single-hand mode: uses whichever hand is currently tracked
        for all control axes (fingers, X filter).
        """
        state = ConductorState()

        # Find whichever hand is currently tracked (MediaPipe MAX_HANDS = 1)
        active_hand = None
        if hand_state.right is not None:
            active_hand = hand_state.right
        elif hand_state.left is not None:
            active_hand = hand_state.left

        if active_hand is not None:
            # Mark which hand is detected
            if active_hand.handedness == "Left":
                state.left_detected = True
            else:
                state.right_detected = True

            # Count fingers on the active hand
            raw_count = count_fingers(
                active_hand.landmarks,
                active_hand.handedness,
            )
            state.finger_count = self._debounce_count(raw_count)

            # Map X coordinate of the hand to dual-mode filter
            state.filter_cutoff_norm = active_hand.wrist_x
            if active_hand.wrist_x < 0.43:
                state.filter_mode = "low"
                t = active_hand.wrist_x / 0.43
                state.filter_cutoff_hz = 100.0 * (200.0 ** t)
            elif active_hand.wrist_x > 0.57:
                state.filter_mode = "high"
                t = (active_hand.wrist_x - 0.57) / 0.43
                state.filter_cutoff_hz = 20.0 * (250.0 ** t)
            else:
                state.filter_mode = "bypass"
                state.filter_cutoff_hz = 20000.0

            state.effect_wet_norm = active_hand.wrist_y
            state.tempo_factor = 1.0
        else:
            # If no hand is detected, keep the last stable finger count so music doesn't cut out
            state.finger_count = self._stable_count

            # Reset DSP effects to default/dry state when hand is removed
            state.filter_cutoff_norm = 0.5
            state.filter_mode = "bypass"
            state.filter_cutoff_hz = 20000.0
            state.effect_wet_norm = 0.0
            state.tempo_factor = 1.0

        return state
