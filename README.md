# Chapter

**Self-hosted ebook reader with AI-narrated audiobooks** — switch seamlessly between reading and listening with word-level progress sync.

## Install

```bash
curl -sSL https://raw.githubusercontent.com/jordanful/chapter/main/install.sh | bash
```

Or manually:

```bash
curl -O https://raw.githubusercontent.com/jordanful/chapter/main/docker-compose.yml
docker compose up -d
```

Open **http://localhost** and create your account.

## Features

- **Read & Listen** — Switch between reading and audiobook mode with one tap
- **Word-level sync** — Your position syncs precisely between modes
- **Local AI voices** — High-quality TTS via [Kokoro](https://github.com/hexgrad/kokoro), no API costs
- **9 voices** — American and British, male and female
- **Multi-user** — Each user has their own library and progress
- **Self-hosted** — Your books, your server, your data

## Requirements

- Docker
- 2GB RAM (4GB recommended)
- 10GB disk space

## Configuration

Create a `.env` file next to `docker-compose.yml`:

```env
# Generate with: openssl rand -base64 48
JWT_SECRET=your-secure-secret

# Audio cache size in bytes (default: 10GB)
AUDIO_CACHE_MAX_SIZE=10737418240
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

MIT
