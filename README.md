# 🎶 Ambient Conductor

**Control music with your hands.** Wave your fingers to layer stems. Sweep your palm to sculpt the sound.

Ambient Conductor is a gesture-controlled music instrument that uses your webcam and hand tracking to mix audio stems and apply real-time DSP effects — no MIDI controller, no DAW, just your hands.

---

## How It Works

```
┌──────────────────┐     Normalized Coordinates     ┌─────────────────────┐
│   Vision Loop    │ ────────────────────────────▶  │    Audio Engine     │
│ (MediaPipe Hands)│   Fingers → Stem Mixer        │ (sounddevice +      │
│                  │   Wrist X → Filter Cutoff     │  scipy DSP)         │
│                  │   Wrist Y → Delay/Reverb      │                     │
└──────────────────┘                                └─────────────────────┘
```

### Controls

A single hand (either left or right) controls all components of the performance simultaneously:

| Gesture / Position | Effect |
|------|--------|
| **Fist (0 fingers)** | Only the ambient pad plays (always active) |
| **1 raised finger** | + Bass line unmutes |
| **2 raised fingers** | + Drums enter |
| **3+ raised fingers** | + Melody/lead unmutes |
| **Move left ↔ right (X)** | Sweep the low-pass filter (300 Hz → 20 kHz) |
| **Move down ↕ up (Y)** | Control delay/reverb wet mix (dry → wet) |

> [!NOTE]
> If you lower your hand or take it off the camera screen, the music continues playing with your last finger count (so it doesn't suddenly cut out), but the filter and echo/delay effects will reset back to their clean default values.

Press **Q** or **Esc** to quit.

---

## Quick Start

### 1. Clone & enter the repo

```bash
cd Infinite-Museum
```

### 2. Create a virtual environment (recommended)

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Generate placeholder stems

```bash
python src/generate_stems.py
```

This creates 4 synthetic audio stems in `stems/` (pad, bass, drums, melody) — all in C minor at 100 BPM. You can replace them with your own stems later.

### 5. Run

```bash
python src/main.py
```

A camera window will open showing your hand tracking with a HUD overlay. Raise your fingers and move your hands!

---

## Custom Stems

To use your own audio, export 4 separate `.wav` files from your song:

1. **`stems/pad.wav`** — Ambient pad / synth layer (always playing)
2. **`stems/bass.wav`** — Bass line
3. **`stems/drums.wav`** — Drum track
4. **`stems/melody.wav`** — Vocals / lead melody

**Requirements:**
- All stems must be the same length (start at the same point)
- WAV format, 44100 Hz sample rate
- Mono or stereo (stereo will be mixed to mono)

---

## CLI Options

```bash
python src/main.py --help
```

| Flag | Default | Description |
|------|---------|-------------|
| `--stems-dir` | `stems` | Path to stems directory |
| `--camera` | `0` | Camera index (try `1` for external webcam) |
| `--no-audio` | off | Run vision-only mode (no sound) |

---

## Project Structure

```
├── requirements.txt        # Python dependencies
├── stems/                  # Audio stem .wav files
│   ├── pad.wav
│   ├── bass.wav
│   ├── drums.wav
│   └── melody.wav
└── src/
    ├── main.py             # Entry point
    ├── vision.py           # OpenCV + MediaPipe hand tracking
    ├── gestures.py         # Finger counting + gesture mapping
    ├── audio_engine.py     # Real-time stem mixing via sounddevice
    ├── dsp.py              # Butterworth filter + feedback delay
    ├── generate_stems.py   # Synthetic stem generator utility
    └── config.py           # Central configuration constants
```

---

## Tech Stack

- **[MediaPipe Hands](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)** — 21-landmark hand tracking at 30+ FPS
- **[OpenCV](https://opencv.org/)** — Webcam capture and frame display
- **[sounddevice](https://python-sounddevice.readthedocs.io/)** — Low-latency callback-based audio I/O (PortAudio)
- **[SciPy](https://scipy.org/)** — Butterworth filter design and real-time IIR filtering
- **[NumPy](https://numpy.org/)** — Array math for audio and coordinate processing
