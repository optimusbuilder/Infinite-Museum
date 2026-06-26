"""
Ambient Conductor — Configuration Constants
=============================================
Central configuration for sample rates, buffer sizes, camera settings,
MediaPipe landmark IDs, and audio mapping ranges.
"""

# ─── Audio ────────────────────────────────────────────────────────────────────
SAMPLE_RATE = 44100
BLOCK_SIZE = 1024          # ~23 ms latency at 44.1 kHz
CHANNELS = 1               # Mono output (stems are mixed to mono)
STEM_DURATION_SEC = 16     # Length of generated placeholder stems

# ─── Camera ───────────────────────────────────────────────────────────────────
CAMERA_INDEX = 0
CAMERA_WIDTH = 1280
CAMERA_HEIGHT = 720

# ─── MediaPipe Hands ──────────────────────────────────────────────────────────
MAX_HANDS = 2
MIN_DETECTION_CONFIDENCE = 0.7
MIN_TRACKING_CONFIDENCE = 0.5

# Landmark IDs (from MediaPipe hand model)
WRIST = 0

THUMB_CMC = 1
THUMB_MCP = 2
THUMB_IP = 3
THUMB_TIP = 4

INDEX_MCP = 5
INDEX_PIP = 6
INDEX_DIP = 7
INDEX_TIP = 8

MIDDLE_MCP = 9
MIDDLE_PIP = 10
MIDDLE_DIP = 11
MIDDLE_TIP = 12

RING_MCP = 13
RING_PIP = 14
RING_DIP = 15
RING_TIP = 16

PINKY_MCP = 17
PINKY_PIP = 18
PINKY_DIP = 19
PINKY_TIP = 20

# Finger tip/pip pairs for counting (excluding thumb)
FINGER_TIPS = [INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP]
FINGER_PIPS = [INDEX_PIP, MIDDLE_PIP, RING_PIP, PINKY_PIP]

# ─── Coordinate Smoothing ────────────────────────────────────────────────────
SMOOTHING_FACTOR = 0.25    # EMA alpha (lower = smoother but laggier)

# ─── Audio Mapping Ranges ────────────────────────────────────────────────────
MIN_CUTOFF_HZ = 300.0      # Right hand X at far left
MAX_CUTOFF_HZ = 20000.0    # Right hand X at far right

# Delay / reverb-like effect
DELAY_TIME_MS = 250.0      # Fixed delay line length
DELAY_FEEDBACK = 0.4       # Feedback amount (0.0 – 1.0, keep < 0.7 to avoid runaway)

# Volume smoothing ramp (prevents clicks on stem mute/unmute)
VOLUME_RAMP_FRAMES = int(SAMPLE_RATE * 0.1 / BLOCK_SIZE)  # ~100 ms in blocks
if VOLUME_RAMP_FRAMES < 1:
    VOLUME_RAMP_FRAMES = 1

# ─── Gesture Debounce ────────────────────────────────────────────────────────
FINGER_COUNT_DEBOUNCE_FRAMES = 3   # Consecutive frames required before state change

# ─── Stem File Names ─────────────────────────────────────────────────────────
STEM_NAMES = ["pad", "bass", "drums", "melody"]
STEMS_DIR = "stems"

# ─── HUD Colors (BGR for OpenCV) ─────────────────────────────────────────────
HUD_BG_COLOR = (20, 20, 20)
HUD_TEXT_COLOR = (220, 220, 220)
HUD_ACCENT_PRIMARY = (237, 58, 124)     # Violet-ish (BGR)
HUD_ACCENT_SECONDARY = (212, 182, 6)    # Cyan-ish (BGR)
HUD_ACTIVE_COLOR = (129, 185, 16)       # Green (BGR)
HUD_INACTIVE_COLOR = (80, 80, 80)       # Dark gray
