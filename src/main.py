"""
Ambient Conductor — Main Entry Point
=======================================
Ties together the vision loop, gesture processor, and audio engine
into a single real-time interactive application.

Usage:
    python src/main.py [--stems-dir PATH] [--camera INDEX] [--no-audio]

Controls:
    Left Hand  → Finger count controls stem mixing (0–5 fingers)
    Right Hand → X-axis controls filter cutoff, Y-axis controls reverb/delay wet mix
    Q / Esc    → Quit
"""

import argparse
import os
import sys
import time

import cv2
import numpy as np

# Ensure src/ is in the path
sys.path.insert(0, os.path.dirname(__file__))

from config import (
    CAMERA_INDEX,
    STEMS_DIR,
    STEM_NAMES,
    HUD_BG_COLOR,
    HUD_TEXT_COLOR,
    HUD_ACCENT_PRIMARY,
    HUD_ACCENT_SECONDARY,
    HUD_ACTIVE_COLOR,
    HUD_INACTIVE_COLOR,
)
from vision import VisionTracker
from gestures import GestureProcessor, ConductorState
from audio_engine import AudioEngine
from generate_stems import generate_all_stems


# ─── HUD Overlay ─────────────────────────────────────────────────────────────

def draw_hud(frame: np.ndarray, state: ConductorState, fps: float) -> np.ndarray:
    """
    Draw an informational heads-up display on the camera frame.

    Shows:
      - Finger count (large, bottom-left)
      - Active stems indicator (colored dots)
      - Filter cutoff bar (horizontal, bottom)
      - Effect wet mix bar (vertical, right side)
      - FPS counter (top-right)
      - Hand detection status
    """
    h, w = frame.shape[:2]
    overlay = frame.copy()

    # ── Semi-transparent background panels ────────────────────────────────

    # Bottom panel
    panel_h = 110
    cv2.rectangle(overlay, (0, h - panel_h), (w, h), HUD_BG_COLOR, -1)
    cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

    # ── FPS counter (top-right) ───────────────────────────────────────────
    fps_text = f"FPS: {fps:.0f}"
    cv2.putText(frame, fps_text, (w - 130, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, HUD_TEXT_COLOR, 1, cv2.LINE_AA)

    # ── Finger count (bottom-left, large) ─────────────────────────────────
    count_text = str(state.finger_count)
    cv2.putText(frame, count_text, (30, h - 25),
                cv2.FONT_HERSHEY_SIMPLEX, 2.5, HUD_ACCENT_PRIMARY, 4, cv2.LINE_AA)
    cv2.putText(frame, "FINGERS", (110, h - 35),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, HUD_TEXT_COLOR, 1, cv2.LINE_AA)

    # ── Active stems indicator (colored dots) ─────────────────────────────
    stem_labels = ["PAD", "BASS", "DRUMS", "MELODY"]
    dot_start_x = 220
    dot_y = h - 50

    for i, label in enumerate(stem_labels):
        x = dot_start_x + i * 100

        # Determine if this stem is active
        active = (i == 0) or (state.finger_count >= i)
        color = HUD_ACTIVE_COLOR if active else HUD_INACTIVE_COLOR

        # Draw dot
        cv2.circle(frame, (x, dot_y), 8, color, -1, cv2.LINE_AA)
        # Glow effect for active stems
        if active:
            cv2.circle(frame, (x, dot_y), 12, color, 1, cv2.LINE_AA)

        # Label
        cv2.putText(frame, label, (x - 18, dot_y + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.35, HUD_TEXT_COLOR, 1, cv2.LINE_AA)

    # ── Filter cutoff bar (horizontal, bottom center) ─────────────────────
    bar_x = 220
    bar_y = h - 90
    bar_w = 380
    bar_h = 8

    # Background
    cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h),
                  HUD_INACTIVE_COLOR, -1, cv2.LINE_AA)
    # Fill
    fill_w = int(bar_w * state.filter_cutoff_norm)
    cv2.rectangle(frame, (bar_x, bar_y), (bar_x + fill_w, bar_y + bar_h),
                  HUD_ACCENT_SECONDARY, -1, cv2.LINE_AA)

    # Label
    cutoff_text = f"FILTER: {state.filter_cutoff_hz:.0f} Hz"
    cv2.putText(frame, cutoff_text, (bar_x, bar_y - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, HUD_TEXT_COLOR, 1, cv2.LINE_AA)

    # ── Effect wet mix bar (vertical, right side) ─────────────────────────
    vbar_x = w - 50
    vbar_y = h - 200
    vbar_w = 12
    vbar_h = 150

    # Background
    cv2.rectangle(frame, (vbar_x, vbar_y), (vbar_x + vbar_w, vbar_y + vbar_h),
                  HUD_INACTIVE_COLOR, -1, cv2.LINE_AA)
    # Fill (from bottom up)
    fill_h = int(vbar_h * state.effect_wet_norm)
    if fill_h > 0:
        cv2.rectangle(frame,
                      (vbar_x, vbar_y + vbar_h - fill_h),
                      (vbar_x + vbar_w, vbar_y + vbar_h),
                      HUD_ACCENT_PRIMARY, -1, cv2.LINE_AA)

    # Label
    wet_pct = int(state.effect_wet_norm * 100)
    cv2.putText(frame, f"FX: {wet_pct}%", (vbar_x - 15, vbar_y - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, HUD_TEXT_COLOR, 1, cv2.LINE_AA)

    # ── Hand detection status ─────────────────────────────────────────────
    left_status = "● L" if state.left_detected else "○ L"
    right_status = "● R" if state.right_detected else "○ R"
    left_color = HUD_ACTIVE_COLOR if state.left_detected else HUD_INACTIVE_COLOR
    right_color = HUD_ACTIVE_COLOR if state.right_detected else HUD_INACTIVE_COLOR

    cv2.putText(frame, left_status, (20, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, left_color, 2, cv2.LINE_AA)
    cv2.putText(frame, right_status, (80, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, right_color, 2, cv2.LINE_AA)

    # ── Title ─────────────────────────────────────────────────────────────
    cv2.putText(frame, "AMBIENT CONDUCTOR", (w // 2 - 120, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, HUD_TEXT_COLOR, 1, cv2.LINE_AA)

    return frame


# ─── Main Loop ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Ambient Conductor — Gesture-controlled music")
    parser.add_argument("--stems-dir", default=STEMS_DIR, help="Path to stems directory")
    parser.add_argument("--camera", type=int, default=CAMERA_INDEX, help="Camera index")
    parser.add_argument("--no-audio", action="store_true", help="Run vision only (no audio)")
    args = parser.parse_args()

    # ── Resolve paths relative to project root ────────────────────────────
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    stems_path = os.path.join(project_root, args.stems_dir)

    # ── Generate stems if they don't exist ────────────────────────────────
    stems_exist = all(
        os.path.exists(os.path.join(stems_path, f"{name}.wav"))
        for name in STEM_NAMES
    )
    if not stems_exist:
        print("📁 Stems not found. Generating placeholder stems...")
        generate_all_stems()

    # ── Banner ────────────────────────────────────────────────────────────
    print("\n" + "=" * 56)
    print("   🎶  A M B I E N T   C O N D U C T O R  🎶")
    print("=" * 56)
    print()
    print("  Left Hand  → Raise fingers to add stems")
    print("  Right Hand → X: filter sweep | Y: delay/reverb")
    print("  Press Q or Esc to quit")
    print()

    # ── Initialize components ─────────────────────────────────────────────
    audio_engine = None
    if not args.no_audio:
        print("🔊 Loading audio engine...")
        audio_engine = AudioEngine(stems_dir=stems_path)
        audio_engine.start()

    print("📷 Starting vision tracker...")
    tracker = VisionTracker(camera_index=args.camera)
    gesture_proc = GestureProcessor()

    print("✅ All systems go! Show your hands to the camera.\n")

    try:
        while True:
            # ── Capture & process frame ───────────────────────────────────
            hand_state = tracker.process_frame()
            if hand_state is None:
                print("⚠ Camera read failed. Retrying...")
                time.sleep(0.1)
                continue

            # ── Extract gesture state ─────────────────────────────────────
            conductor_state = gesture_proc.process(hand_state)

            # ── Update audio engine ───────────────────────────────────────
            if audio_engine is not None:
                audio_engine.update_state(conductor_state)

            # ── Draw HUD overlay ──────────────────────────────────────────
            if hand_state.frame is not None:
                frame = draw_hud(hand_state.frame, conductor_state, hand_state.fps)
                cv2.imshow("Ambient Conductor", frame)

            # ── Check for quit ────────────────────────────────────────────
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:  # Q or Esc
                break

    except KeyboardInterrupt:
        print("\n\n⚡ Interrupted by user.")

    finally:
        # ── Cleanup ───────────────────────────────────────────────────────
        print("\n🧹 Cleaning up...")
        if audio_engine is not None:
            audio_engine.stop()
        tracker.release()
        cv2.destroyAllWindows()
        print("👋 Goodbye!\n")


if __name__ == "__main__":
    main()
