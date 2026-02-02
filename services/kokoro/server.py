#!/usr/bin/env python3
"""
Kokoro TTS HTTP Service
Wraps the Kokoro TTS model in a simple HTTP API
"""

import io
import os
import wave
import numpy as np
from flask import Flask, request, jsonify, send_file
from kokoro_onnx import Kokoro

app = Flask(__name__)

# Initialize Kokoro TTS (loaded once at startup)
# Models will be downloaded automatically on first use
print("Loading Kokoro TTS model...")
model_path = os.path.expanduser("~/.cache/kokoro/kokoro-v1.0.onnx")
voices_path = os.path.expanduser("~/.cache/kokoro/voices.bin")
kokoro = Kokoro(model_path, voices_path)
print("Kokoro TTS model loaded successfully!")

# Default settings
DEFAULT_SPEED = 1.0
DEFAULT_VOICE = 'af_bella'

# Voice mapping (kokoro-onnx uses these voice codes)
VOICE_MAP = {
    'af_bella': 'af_bella',
    'af_nicole': 'af_nicole',
    'af_sarah': 'af_sarah',
    'af_sky': 'af_sky',
    'am_adam': 'am_adam',
    'am_michael': 'am_michael',
    'bf_emma': 'bf_emma',
    'bf_isabella': 'bf_isabella',
    'bm': 'bm',
}

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'kokoro-tts'})

@app.route('/synthesize', methods=['POST'])
def synthesize():
    """
    Synthesize speech from text

    Request JSON:
    {
        "text": "Hello world",
        "voice": "af_bella",
        "speed": 1.0,
        "temperature": 0.7
    }
    """
    try:
        data = request.get_json()

        if not data or 'text' not in data:
            return jsonify({'error': 'Missing required field: text'}), 400

        text = data['text']
        voice = data.get('voice', DEFAULT_VOICE)
        speed = float(data.get('speed', DEFAULT_SPEED))

        # Validate voice
        if voice not in VOICE_MAP:
            return jsonify({'error': f'Invalid voice: {voice}'}), 400

        # Generate speech using Kokoro-ONNX
        audio, sample_rate = kokoro.create(
            text,
            voice=VOICE_MAP[voice],
            speed=speed,
        )

        # Convert float32 audio to int16
        audio_int16 = (audio * 32767).astype(np.int16)

        # Convert to WAV format
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(audio_int16.tobytes())

        wav_buffer.seek(0)

        # Calculate duration
        duration = len(audio) / sample_rate

        # Return WAV file with duration header
        response = send_file(
            wav_buffer,
            mimetype='audio/wav',
            as_attachment=False,
            download_name='speech.wav'
        )
        response.headers['X-Audio-Duration'] = str(duration)
        response.headers['X-Sample-Rate'] = str(sample_rate)

        return response

    except Exception as e:
        print(f"Error generating speech: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/voices', methods=['GET'])
def voices():
    """List available voices"""
    return jsonify({
        'voices': list(VOICE_MAP.keys()),
        'default': DEFAULT_VOICE
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Kokoro TTS server on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
