# Kokoro TTS Service

HTTP API wrapper around the [Kokoro TTS model](https://github.com/hexgrad/kokoro) — a high-quality, locally-hosted text-to-speech system.

## Quick Start

```bash
# With Docker (recommended)
docker build -t kokoro-tts .
docker run -p 5000:5000 kokoro-tts

# Test it
curl http://localhost:5000/health
```

## Available Voices

| Voice ID | Name | Accent | Description |
|----------|------|--------|-------------|
| `af_bella` | Bella | American Female | Warm, friendly |
| `af_nicole` | Nicole | American Female | Professional, clear |
| `af_sarah` | Sarah | American Female | Soft, gentle |
| `af_sky` | Sky | American Female | Bright, energetic |
| `am_adam` | Adam | American Male | Deep, authoritative |
| `am_michael` | Michael | American Male | Friendly, casual |
| `bf_emma` | Emma | British Female | Received pronunciation |
| `bf_isabella` | Isabella | British Female | Elegant, refined |
| `bm` | British Male | British Male | Standard British |

## API Endpoints

### `GET /health`

Health check endpoint.

```bash
curl http://localhost:5000/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "kokoro-tts"
}
```

### `POST /synthesize`

Generate speech from text.

```bash
curl -X POST http://localhost:5000/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, world!", "voice": "af_bella"}' \
  --output speech.wav
```

**Request Body:**
```json
{
  "text": "Text to synthesize",
  "voice": "af_bella",
  "speed": 1.0,
  "temperature": 0.7
}
```

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | — | Text to synthesize |
| `voice` | string | No | `af_bella` | Voice ID (see table above) |
| `speed` | float | No | `1.0` | Speaking rate (0.5–2.0) |
| `temperature` | float | No | `0.7` | Voice variation (0.0–1.0) |

**Response:**
- Content-Type: `audio/wav`
- Format: 24kHz, 16-bit, mono PCM

**Response Headers:**
- `X-Audio-Duration`: Duration in seconds
- `X-Sample-Rate`: Sample rate (24000)

### `GET /voices`

List available voices.

```bash
curl http://localhost:5000/voices
```

**Response:**
```json
{
  "voices": [
    "af_bella",
    "af_nicole",
    "af_sarah",
    "af_sky",
    "am_adam",
    "am_michael",
    "bf_emma",
    "bf_isabella",
    "bm"
  ],
  "default": "af_bella"
}
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | `5000` | Server port |

## Development

```bash
# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
python server.py

# Test
curl -X POST http://localhost:5000/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello!"}' \
  --output test.wav

# Play audio (macOS)
afplay test.wav
```

## Docker

```bash
# Build
docker build -t kokoro-tts .

# Run
docker run -p 5000:5000 kokoro-tts

# Run with persistent model cache
docker run -p 5000:5000 -v kokoro-cache:/root/.cache/kokoro kokoro-tts
```

## GPU Acceleration

GPU support provides 5-10x faster generation.

### Requirements
- NVIDIA GPU with CUDA support
- NVIDIA Container Toolkit

### Setup

1. Update `requirements.txt`:
```txt
# Replace onnxruntime with:
onnxruntime-gpu>=1.16.0
```

2. Rebuild container:
```bash
docker build -t kokoro-tts .
```

3. Run with GPU:
```bash
docker run --gpus all -p 5000:5000 kokoro-tts
```

## Performance

| Mode | Speed | Memory |
|------|-------|--------|
| CPU | ~1-2x realtime | ~500 MB RAM |
| GPU | ~5-10x realtime | ~2 GB VRAM |

## Notes

- First request downloads model files (~100 MB)
- Models are cached in `/root/.cache/kokoro` (Docker) or `~/.cache/kokoro` (local)
- Supports English text only (American and British accents)
- Maximum recommended text length: ~500 characters per request

## Troubleshooting

**Model download fails:**
- Check internet connection
- Verify outbound HTTPS access to GitHub

**Out of memory:**
- Increase Docker memory limit
- Use GPU mode to reduce CPU memory usage

**Slow generation:**
- CPU mode is ~1-2x realtime (normal)
- Enable GPU for faster processing
- Reduce concurrent requests

## License

Kokoro is released under the Apache 2.0 license. See the [Kokoro repository](https://github.com/hexgrad/kokoro) for details.
