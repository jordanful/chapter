# Kokoro TTS Integration

Chapter uses [Kokoro](https://github.com/hexgrad/kokoro) - a frontier-quality, locally-hosted TTS system. This means:

- ✅ **No API costs** - runs entirely on your server
- ✅ **Privacy** - your text never leaves your infrastructure
- ✅ **No rate limits** - generate as much audio as needed
- ✅ **High quality** - frontier-level voice quality
- ✅ **Multiple voices** - 9 different voices with American and British accents

## Architecture

```
┌─────────────┐      HTTP       ┌──────────────┐
│   Chapter   │ ─────────────> │   Kokoro     │
│   Server    │   /synthesize   │   Service    │
│  (Node.js)  │ <─────────────  │  (Python)    │
└─────────────┘      WAV        └──────────────┘
                                       │
                                  ONNX Model
                                  (CPU/GPU)
```

The Chapter server communicates with a separate Python-based Kokoro service via HTTP. The Kokoro service handles all TTS generation using ONNX Runtime.

## Available Voices

### American English (en-US)

**Female Voices:**
- `af_bella` - Bella (warm, friendly)
- `af_nicole` - Nicole (professional, clear)
- `af_sarah` - Sarah (soft, gentle)
- `af_sky` - Sky (bright, energetic)

**Male Voices:**
- `am_adam` - Adam (deep, authoritative)
- `am_michael` - Michael (friendly, casual)

### British English (en-GB)

**Female Voices:**
- `bf_emma` - Emma (received pronunciation)
- `bf_isabella` - Isabella (elegant, refined)

**Male Voices:**
- `bm` - British Male (standard British accent)

## Performance

### CPU Mode (Default)

- **Speed**: ~1-2x realtime on modern CPUs
- **Memory**: ~500MB per instance
- **Quality**: Full quality

### GPU Mode (Optional)

For faster generation, you can enable GPU support:

1. Uncomment the GPU section in `docker/docker-compose.yml`:
```yaml
kokoro:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

2. Update `services/kokoro/requirements.txt`:
```
# Replace onnxruntime with:
onnxruntime-gpu>=1.16.0
```

3. Rebuild:
```bash
cd docker
docker-compose build kokoro
docker-compose up -d
```

**GPU Performance:**
- **Speed**: ~5-10x realtime on NVIDIA GPUs
- **Memory**: ~2GB VRAM
- **Quality**: Same as CPU mode

## Configuration

### Server Environment Variables

```bash
# Kokoro service URL (default: http://kokoro:5000)
KOKORO_SERVICE_URL=http://kokoro:5000

# Default voice (default: af_bella)
TTS_DEFAULT_VOICE=af_bella
```

### User Settings

Users can configure TTS in the web interface:

- **Voice**: Select from 9 available voices
- **Speed**: 0.5x to 2.0x (default: 1.0x)
- **Temperature**: 0.0 to 1.0 for voice variation (default: 0.7)

## API Usage

### Health Check

```bash
curl http://localhost:5000/health
```

Response:
```json
{
  "status": "ok",
  "service": "kokoro-tts"
}
```

### Generate Speech

```bash
curl -X POST http://localhost:5000/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, world!",
    "voice": "af_bella",
    "speed": 1.0,
    "temperature": 0.7
  }' \
  --output speech.wav
```

Response headers:
- `X-Audio-Duration`: Duration in seconds
- `X-Sample-Rate`: Sample rate (24000 Hz)

### List Voices

```bash
curl http://localhost:5000/voices
```

Response:
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

## Caching

Chapter caches all generated audio to minimize regeneration:

- **Cache key**: Hash of (text + voice + settings)
- **Format**: WAV (24kHz, 16-bit, mono)
- **Storage**: Local filesystem
- **Eviction**: LRU when cache exceeds configured size
- **Default size**: 10GB

This means:
- First generation: ~1-2 seconds per chunk
- Subsequent plays: Instant (served from cache)
- Same text + voice + settings = cache hit

## Troubleshooting

### Service Won't Start

Check logs:
```bash
cd docker
docker-compose logs kokoro
```

Common issues:
- **OOM errors**: Increase Docker memory limit
- **Model download failed**: Check internet connection
- **Import errors**: Rebuild container

### Slow Generation

**CPU Mode:**
- Normal: 1-2x realtime
- If slower: Check CPU usage, reduce concurrent requests

**GPU Mode:**
- Should be 5-10x realtime
- If slower: Check GPU drivers, CUDA version

### Audio Quality Issues

- **Robotic voice**: Increase temperature (0.7-0.9)
- **Too much variation**: Decrease temperature (0.5-0.7)
- **Too fast/slow**: Adjust speed setting
- **Glitches**: Check for very long text (split into chunks)

## Development

### Running Kokoro Locally

```bash
# Start Kokoro service
cd services/kokoro
pip install -r requirements.txt
python server.py

# Test
curl http://localhost:5000/health
```

### Adding New Voices

Kokoro supports the voices defined in the model. To add new voices:

1. Check Kokoro repo for available voices
2. Update `VOICE_MAP` in `services/kokoro/server.py`
3. Update `KOKORO_VOICES` in `apps/server/src/modules/tts/kokoro.service.ts`
4. Rebuild and restart

## Model Information

- **Architecture**: Transformer-based neural TTS
- **Framework**: ONNX Runtime
- **Sample Rate**: 24kHz
- **Format**: 16-bit PCM
- **Channels**: Mono
- **Language**: English (US & UK accents)

## Resources

- [Kokoro GitHub](https://github.com/hexgrad/kokoro)
- [ONNX Runtime](https://onnxruntime.ai/)
- [Model Card](https://github.com/hexgrad/kokoro#model-card)

## See Also

- [Self-Hosting Guide](./SELF_HOSTING.md) - Production deployment with GPU setup
- [Why Kokoro?](./WHY_KOKORO.md) - Comparison with other TTS options
- [Architecture](./ARCHITECTURE.md) - Overall system design

## License

Kokoro is released under the Apache 2.0 license. See the [Kokoro repository](https://github.com/hexgrad/kokoro) for details.
