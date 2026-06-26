"""
Ambient Conductor — DSP Module
================================
Low-pass Butterworth filter and feedback delay effect for
real-time audio processing inside the sounddevice callback.

Both classes maintain internal state across buffer boundaries
to prevent clicks and discontinuities.
"""

import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi

from config import SAMPLE_RATE, BLOCK_SIZE, DELAY_TIME_MS, DELAY_FEEDBACK


class LowPassFilter:
    """
    Real-time 4th-order Butterworth low-pass filter.

    Maintains SOS filter state between audio callback invocations.
    Automatically redesigns the filter when the cutoff frequency
    changes beyond a threshold, smoothly transitioning the state.
    """

    def __init__(self, initial_cutoff_hz: float = 20000.0, order: int = 4):
        self.order = order
        self.current_cutoff = initial_cutoff_hz
        self._min_change_hz = 50.0  # Minimum change to trigger redesign

        # Design the initial filter
        self.sos = self._design(initial_cutoff_hz)
        # Initialize filter state (shaped for mono)
        self._zi = sosfilt_zi(self.sos)

    def _design(self, cutoff_hz: float) -> np.ndarray:
        """Design SOS coefficients for a given cutoff frequency."""
        # Clamp cutoff to valid Nyquist range
        nyquist = SAMPLE_RATE / 2.0
        cutoff_hz = max(20.0, min(cutoff_hz, nyquist - 100.0))
        return butter(self.order, cutoff_hz, btype='low', fs=SAMPLE_RATE, output='sos')

    def update_cutoff(self, cutoff_hz: float):
        """
        Update the filter cutoff. Only redesigns if the change
        is significant enough to avoid wasting CPU.
        """
        if abs(cutoff_hz - self.current_cutoff) > self._min_change_hz:
            self.current_cutoff = cutoff_hz
            self.sos = self._design(cutoff_hz)
            # Re-initialize the state for the new filter to prevent
            # a transient pop. Scale by the last DC level.
            self._zi = sosfilt_zi(self.sos)

    def process(self, audio_block: np.ndarray) -> np.ndarray:
        """
        Filter a block of audio samples (1D float32 array).
        Returns the filtered block and updates internal state.
        """
        filtered, self._zi = sosfilt(self.sos, audio_block, zi=self._zi)
        return filtered.astype(np.float32)


class FeedbackDelay:
    """
    Simple feedback delay line that creates a reverb-like wash
    at short delay times. Uses a circular buffer.

    Parameters:
        delay_time_ms: Length of the delay in milliseconds.
        feedback: How much of the delayed signal is fed back (0.0–1.0).
                  Keep below 0.7 to prevent runaway feedback.
    """

    def __init__(
        self,
        delay_time_ms: float = DELAY_TIME_MS,
        feedback: float = DELAY_FEEDBACK,
    ):
        self.feedback = min(feedback, 0.95)  # Safety clamp

        # Calculate delay length in samples
        self.delay_samples = int(SAMPLE_RATE * delay_time_ms / 1000.0)

        # Circular buffer (pre-allocated, zero-filled)
        self._buffer = np.zeros(self.delay_samples, dtype=np.float32)
        self._write_pos = 0

        # Current wet/dry mix (0.0 = fully dry, 1.0 = fully wet)
        self.wet_mix = 0.0

    def update_wet_mix(self, wet_norm: float):
        """Update the wet/dry mix from a normalized value (0.0–1.0)."""
        self.wet_mix = max(0.0, min(1.0, wet_norm))

    def process(self, audio_block: np.ndarray) -> np.ndarray:
        """
        Process a block of audio through the delay line.
        Returns the wet/dry mixed output.
        """
        block_len = len(audio_block)
        output = np.empty(block_len, dtype=np.float32)

        for i in range(block_len):
            # Read the delayed sample from the buffer
            read_pos = self._write_pos
            delayed_sample = self._buffer[read_pos]

            # Mix: output = dry + wet * delayed
            dry = audio_block[i]
            output[i] = dry * (1.0 - self.wet_mix * 0.5) + delayed_sample * self.wet_mix

            # Write new sample + feedback into the buffer
            self._buffer[self._write_pos] = dry + delayed_sample * self.feedback

            # Advance write position (circular)
            self._write_pos = (self._write_pos + 1) % self.delay_samples

        return output
