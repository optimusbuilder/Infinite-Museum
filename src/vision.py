"""
Ambient Conductor — Vision Module
===================================
Captures webcam frames via OpenCV, runs MediaPipe Hand Landmarker
(Tasks API) to detect up to 2 hands, and returns normalized,
smoothed wrist coordinates along with full landmark data for
gesture processing.
"""

import os
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

# ─── MediaPipe Tasks API imports ──────────────────────────────────────────────
BaseOptions = mp.tasks.BaseOptions
HandLandmarker = mp.tasks.vision.HandLandmarker
HandLandmarkerOptions = mp.tasks.vision.HandLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

# Hand connections for drawing (21 landmarks, standard topology)
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),       # Thumb
    (0, 5), (5, 6), (6, 7), (7, 8),       # Index
    (0, 9), (9, 10), (10, 11), (11, 12),   # Middle  (fixed: 0→9 not 5→9)
    (0, 13), (13, 14), (14, 15), (15, 16), # Ring    (fixed: 0→13)
    (0, 17), (17, 18), (18, 19), (19, 20), # Pinky   (fixed: 0→17)
    (5, 9), (9, 13), (13, 17),             # Palm
]


@dataclass
class HandData:
    """Normalized data for a single detected hand."""
    wrist_x: float = 0.5
    wrist_y: float = 0.5       # Already Y-inverted (up = 1.0)
    landmarks: list = field(default_factory=list)  # All 21 landmark objects
    handedness: str = "Unknown"


@dataclass
class HandState:
    """Combined state for both hands in a single frame."""
    left: Optional[HandData] = None
    right: Optional[HandData] = None
    frame: Optional[np.ndarray] = None   # Annotated camera frame for display
    fps: float = 0.0


def _find_model_path() -> str:
    """Locate the hand_landmarker.task model file."""
    # Check relative to this file's directory (src/)
    src_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(src_dir)

    candidates = [
        os.path.join(project_root, "models", "hand_landmarker.task"),
        os.path.join(project_root, "hand_landmarker.task"),
        os.path.join(src_dir, "hand_landmarker.task"),
    ]

    for path in candidates:
        if os.path.exists(path):
            return path

    raise FileNotFoundError(
        "Could not find 'hand_landmarker.task' model file. "
        "Download it with:\n"
        "  curl -L -o models/hand_landmarker.task --create-dirs "
        '"https://storage.googleapis.com/mediapipe-models/hand_landmarker/'
        'hand_landmarker/float16/latest/hand_landmarker.task"'
    )


class VisionTracker:
    """
    Manages the webcam capture and MediaPipe Hand Landmarker pipeline.
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

        # ── MediaPipe Hand Landmarker (Tasks API) ─────────────────────────
        model_path = _find_model_path()
        print(f"  ✓ Loading model: {model_path}")

        options = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=model_path),
            running_mode=VisionRunningMode.VIDEO,
            num_hands=MAX_HANDS,
            min_hand_detection_confidence=MIN_DETECTION_CONFIDENCE,
            min_tracking_confidence=MIN_TRACKING_CONFIDENCE,
        )
        self.landmarker = HandLandmarker.create_from_options(options)

        # ── Frame timestamp tracking (required for VIDEO mode) ────────────
        self._frame_timestamp_ms = 0

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

    def _draw_landmarks(self, frame: np.ndarray, landmarks, is_left: bool):
        """
        Draw hand landmarks and connections on the frame.
        Replaces the old mp.solutions.drawing_utils functionality.
        """
        h, w = frame.shape[:2]

        # Convert normalized landmarks to pixel coordinates
        points = []
        for lm in landmarks:
            px = int(lm.x * w)
            py = int(lm.y * h)
            points.append((px, py))

        # Draw connections
        color = (100, 255, 100) if is_left else (100, 100, 255)  # Green for left, blue for right
        for start_idx, end_idx in HAND_CONNECTIONS:
            if start_idx < len(points) and end_idx < len(points):
                cv2.line(frame, points[start_idx], points[end_idx], color, 2, cv2.LINE_AA)

        # Draw landmark dots
        for i, (px, py) in enumerate(points):
            # Fingertips get larger dots
            radius = 5 if i in (4, 8, 12, 16, 20) else 3
            cv2.circle(frame, (px, py), radius, (255, 255, 255), -1, cv2.LINE_AA)
            cv2.circle(frame, (px, py), radius, color, 1, cv2.LINE_AA)

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

        # ── FPS calculation ───────────────────────────────────────────────
        current_time = cv2.getTickCount()
        if self._prev_time > 0:
            elapsed = (current_time - self._prev_time) / cv2.getTickFrequency()
            fps = 1.0 / elapsed if elapsed > 0 else 0.0
        else:
            fps = 0.0
        self._prev_time = current_time

        # ── Run MediaPipe Hand Landmarker ─────────────────────────────────
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        self._frame_timestamp_ms += 33  # ~30 FPS increment
        results = self.landmarker.detect_for_video(mp_image, self._frame_timestamp_ms)

        # ── Parse results ─────────────────────────────────────────────────
        state = HandState(fps=fps)
        left_data: Optional[HandData] = None
        right_data: Optional[HandData] = None

        if results.hand_landmarks and results.handedness:
            for hand_landmarks, hand_info in zip(
                results.hand_landmarks, results.handedness
            ):
                # Classify handedness
                # The Tasks API returns handedness as a list of Category objects.
                # Note: MediaPipe labels are from the camera's perspective,
                # and we flipped the frame, so "Left" label = user's left hand.
                label = hand_info[0].category_name  # "Left" or "Right"

                # Draw landmarks on the frame
                is_left = (label == "Left")
                self._draw_landmarks(frame, hand_landmarks, is_left)

                # Extract wrist position (normalized 0–1)
                wrist = hand_landmarks[WRIST]
                raw_x = wrist.x
                raw_y = 1.0 - wrist.y  # Invert Y: up = higher value

                # Clamp to [0, 1]
                raw_x = max(0.0, min(1.0, raw_x))
                raw_y = max(0.0, min(1.0, raw_y))

                hand_data = HandData(
                    wrist_x=raw_x,
                    wrist_y=raw_y,
                    landmarks=hand_landmarks,
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
        self.landmarker.close()
