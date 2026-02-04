# Chapter

**Self-hosted ebook reader with AI-narrated audiobooks** — switch seamlessly between reading and listening with word-level progress sync.

![Chapter](chapter.png)

## Install

```bash
curl -sSL https://raw.githubusercontent.com/jordanful/chapter/master/install.sh | bash
```

Or manually:

```bash
curl -O https://raw.githubusercontent.com/jordanful/chapter/master/docker-compose.yml
docker compose up -d
```

Open **http://localhost** and create your account.

## Features

- **Read & Listen** — Switch between reading and audiobook mode with one tap
- **Word-level sync** — Your position syncs precisely between modes
- **Local AI voices** — High-quality TTS via [Kokoro](https://github.com/hexgrad/kokoro), no API costs
- **9 voices** — American and British, male and female
- **Library folders** — Auto-import books from filesystem folders (like Plex/Calibre)
- **Multi-user** _(coming soon)_ — Each user has their own library and progress
- **Self-hosted** — Your books, your server, your data

## Requirements

- **Docker** - Required
- **CPU:** 2+ cores (4+ recommended for better TTS performance)
- **RAM:** 2GB minimum (4GB recommended)
- **Storage:** 15GB minimum (30GB+ recommended)
- **GPU:** Optional NVIDIA GPU for 5-10x faster audiobook generation

_Note: TTS generation is CPU/GPU intensive. Without GPU: ~10-15s per chapter. With GPU: ~1-2s per chapter. Audio is cached permanently._

## Configuration

Create a `.env` file next to `docker-compose.yml`:

```env
# Generate with: openssl rand -base64 48
JWT_SECRET=your-secure-secret

# Audio cache size in bytes (default: 10GB)
AUDIO_CACHE_MAX_SIZE=10737418240

# Library folder limits (optional)
MAX_WATCHED_FOLDERS=20        # Max folders per user (default: 20)
SCAN_TIMEOUT=300000           # Scan timeout in ms (default: 5 min)
MAX_SCAN_DEPTH=10             # Max directory depth (default: 10)
```

### Custom domain with HTTPS

Edit the Caddyfile section in `docker-compose.yml`:

```
yourdomain.com {
  handle /api/* {
    reverse_proxy server:3001
  }
  handle {
    reverse_proxy web:3000
  }
}
```

Caddy automatically provisions SSL certificates.

### GPU acceleration

For faster TTS generation, uncomment the GPU section in `docker-compose.yml`:

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

Requires [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

### Library folders

Mount external book folders to auto-import EPUBs. Add to `docker-compose.yml` under `server.volumes`:

```yaml
server:
  volumes:
    - chapter_data:/app/data
    - /path/to/your/books:/library/books:ro # Read-only mount
```

Then in Settings → Library, add `/library/books` as a watched folder. Chapter will scan and import books automatically.

**Notes:**

- Use container paths (e.g., `/library/books`), not host paths
- Mount as read-only (`:ro`) for safety
- Books are copied to internal storage (supports deduplication across folders)
- Multiple folders can be mounted and watched

## Commands

```bash
docker compose up -d      # Start
docker compose down       # Stop
docker compose logs -f    # View logs
docker compose pull       # Update to latest
```

## Backup

All data is in a single Docker volume. To backup:

```bash
# Database + books in one volume
docker compose cp server:/app/data ./backup
```

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

```bash
git clone https://github.com/jordanful/chapter.git
cd chapter
./scripts/dev-setup.sh
pnpm dev
```

## Documentation

- [Self-Hosting Guide](docs/SELF_HOSTING.md) — Production deployment, backups, troubleshooting
- [Architecture](docs/ARCHITECTURE.md) — System design
- [Kokoro TTS](docs/KOKORO.md) — Voice configuration

## License

[GPL-2.0](LICENSE)
