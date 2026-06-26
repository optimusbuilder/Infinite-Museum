"""
Ambient Conductor — Vision Module
===================================
Captures webcam frames via OpenCV, runs MediaPipe Hands to detect
up to 2 hands, and returns normalized, smoothed wrist coordinates
along with full landmark data for gesture processing.
"""

from dataclasses import dataclass, field
from typing import Optional

import cv2
import mediapipe as mp
import numpy as np

from config import (
    CAMERA_INDEX,
    CAMERA_WIDTH,
    CAMERA_HEIGHT,
    MAX_HANDS,
    MIN_DETECTION_CONFIDENCE,
    MIN_TRACKING_CONFIDENCE,
    SMOOTHING_FACTOR,
    WRIST,
)


@dataclass
class HandData:
    """Normalized data for a single detected hand."""
    wrist_x: float = 0.5
    wrist_y: float = 0.5       # Already Y-inverted (up = 1.0)
    landmarks: list = field(default_factory=list)  # All 21 raw landmark objects
    handedness: str = "Unknown"


@dataclass
class HandState:
    """Combined state for both hands in a single frame."""
    left: Optional[HandData] = None
    right: Optional[HandData] = None
    frame: Optional[np.ndarray] = None   # Annotated camera frame for display
    fps: float = 0.0


class VisionTracker:
    """
    Manages the webcam capture and MediaPipe Hands pipeline.
    Call `process_frame()` each iteration of your main loop.
    """

    def __init__(self, camera_index: int = CAMERA_INDEX):
        # ── Camera setup ──────────────────────────────────────────────────
        self.cap = cv2.VideoCapture(camera_index)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)

        if not self.cap.isOpened():
            raise RuntimeError(
                f"Cannot open camera at index {camera_index}. "
                "Check that your webcam is connected and camera permissions "
                "are granted for your terminal app."
            )

        # ── MediaPipe Hands ───────────────────────────────────────────────
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=MAX_HANDS,
            min_detection_confidence=MIN_DETECTION_CONFIDENCE,
            min_tracking_confidence=MIN_TRACKING_CONFIDENCE,
        )
        self.mp_draw = mp.solutions.drawing_utils
        self.mp_draw_styles = mp.solutions.drawing_styles

        # ── EMA smoothing state ───────────────────────────────────────────
        self._smooth_left_x: float = 0.5
        self._smooth_left_y: float = 0.5
        self._smooth_right_x: float = 0.5
        self._smooth_right_y: float = 0.5

        # ── FPS tracking ─────────────────────────────────────────────────
        self._prev_time: float = 0.0

    def _ema(self, prev: float, new: float, alpha: float = SMOOTHING_FACTOR) -> float:
        """Exponential moving average for jitter reduction."""
        return prev + alpha * (new - prev)

    def process_frame(self) -> Optional[HandState]:
        """
        Capture one frame, run hand detection, and return a HandState.
        Returns None if the camera read fails.
        """
        ret, frame = self.cap.read()
        if not ret:
            return None

        # Flip horizontally so it feels like a mirror
        frame = cv2.flip(frame, 1)

        # Convert BGR → RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb_frame.flags.writeable = False
        results = self.hands.process(rgb_frame)
        rgb_frame.flags.writeable = True

        # ── FPS calculation ───────────────────────────────────────────────
        current_time = cv2.getTickCount()
        if self._prev_time > 0:
            elapsed = (current_time - self._prev_time) / cv2.getTickFrequency()
            fps = 1.0 / elapsed if elapsed > 0 else 0.0
        else:
            fps = 0.0
        self._prev_time = current_time

        # ── Parse results ─────────────────────────────────────────────────
        state = HandState(fps=fps)
        left_data: Optional[HandData] = None
        right_data: Optional[HandData] = None

        if results.multi_hand_landmarks and results.multi_handedness:
            for hand_landmarks, hand_info in zip(
                results.multi_hand_landmarks, results.multi_handedness
            ):
                # Draw landmarks on the frame
                self.mp_draw.draw_landmarks(
                    frame,
                    hand_landmarks,
                    self.mp_hands.HAND_CONNECTIONS,
                    self.mp_draw_styles.get_default_hand_landmarks_style(),
                    self.mp_draw_styles.get_default_hand_connections_style(),
                )

                # Classify handedness
                # Note: MediaPipe labels are from the camera's perspective,
                # and we flipped the frame, so "Left" label = user's left hand.
                label = hand_info.classification[0].label  # "Left" or "Right"

                # Extract wrist position (normalized 0–1)
                wrist = hand_landmarks.landmark[WRIST]
                raw_x = wrist.x
                raw_y = 1.0 - wrist.y  # Invert Y: up = higher value

                # Clamp to [0, 1]
                raw_x = max(0.0, min(1.0, raw_x))
                raw_y = max(0.0, min(1.0, raw_y))

                hand_data = HandData(
                    wrist_x=raw_x,
                    wrist_y=raw_y,
                    landmarks=hand_landmarks.landmark,
                    handedness=label,
                )

                if label == "Left":
                    left_data = hand_data
                elif label == "Right":
                    right_data = hand_data

        # ── Apply EMA smoothing ───────────────────────────────────────────
        if left_data:
            self._smooth_left_x = self._ema(self._smooth_left_x, left_data.wrist_x)
            self._smooth_left_y = self._ema(self._smooth_left_y, left_data.wrist_y)
            left_data.wrist_x = self._smooth_left_x
            left_data.wrist_y = self._smooth_left_y
            state.left = left_data

        if right_data:
            self._smooth_right_x = self._ema(self._smooth_right_x, right_data.wrist_x)
            self._smooth_right_y = self._ema(self._smooth_right_y, right_data.wrist_y)
            right_data.wrist_x = self._smooth_right_x
            right_data.wrist_y = self._smooth_right_y
            state.right = right_data

        state.frame = frame
        return state

    def release(self):
        """Release camera and MediaPipe resources."""
        self.cap.release()
        self.hands.close()
