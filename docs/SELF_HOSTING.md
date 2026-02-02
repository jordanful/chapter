# Self-Hosting Guide

This guide covers everything you need to deploy Chapter on your own server.

## Table of Contents

- [System Requirements](#system-requirements)
- [Quick Start](#quick-start)
- [Production Deployment](#production-deployment)
- [Configuration](#configuration)
- [GPU Acceleration](#gpu-acceleration)
- [Reverse Proxy Setup](#reverse-proxy-setup)
- [Backup and Restore](#backup-and-restore)
- [Updating Chapter](#updating-chapter)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 2 GB | 4+ GB |
| Storage | 10 GB | 50+ GB |
| OS | Linux (x86_64) | Ubuntu 22.04+ |

### Storage Breakdown

- **Docker images:** ~2 GB
- **Kokoro TTS model:** ~500 MB (downloaded on first run)
- **Audio cache:** 10 GB default (configurable)
- **Book storage:** Depends on library size (~1-5 MB per book)
- **Database:** ~100 MB base + growth

### Network Requirements

- Port 80 (HTTP) and/or 443 (HTTPS)
- Outbound internet access during first startup (to pull images and download TTS model)

---

## Quick Start

```bash
curl -sSL https://raw.githubusercontent.com/jordanful/chapter/main/install.sh | bash
```

Or manually:

```bash
mkdir -p ~/chapter && cd ~/chapter
curl -O https://raw.githubusercontent.com/jordanful/chapter/main/docker-compose.yml
docker compose up -d
```

Open **http://localhost** in your browser.

---

## Production Deployment

### Step 1: Prepare Your Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin

# Log out and back in for group changes
```

### Step 2: Install Chapter

```bash
mkdir -p ~/chapter && cd ~/chapter
curl -O https://raw.githubusercontent.com/jordanful/chapter/main/docker-compose.yml
```

### Step 3: Configure

Create a `.env` file with secure secrets:

```bash
cat > .env << EOF
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '=/+')
JWT_SECRET=$(openssl rand -base64 48 | tr -d '=/+')
EOF
```

### Step 4: Configure Your Domain

Edit the Caddyfile config section in `docker-compose.yml`:

```yaml
configs:
  caddyfile:
    content: |
      yourdomain.com {
        handle /api/* {
          reverse_proxy server:3001
        }
        handle {
          reverse_proxy web:3000
        }
      }
```

Caddy automatically provisions HTTPS certificates via Let's Encrypt.

### Step 5: Start Services

```bash
docker compose up -d

# Watch logs
docker compose logs -f

# Check service health
docker compose ps
```

### Step 6: Verify Installation

```bash
# Check all services are healthy
docker compose ps

# Test the web interface
curl -I http://localhost
```

---

## Configuration

### Environment Variables

All configuration is done through environment variables in `docker/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_PASSWORD` | `changeme` | Database password (change this!) |
| `JWT_SECRET` | — | Secret for signing tokens (change this!) |
| `AUDIO_CACHE_MAX_SIZE` | `10737418240` | Max audio cache size in bytes (10 GB) |

### Server Configuration

Additional server options can be set in `docker-compose.yml` under the `server` service:

```yaml
environment:
  # TTS settings
  TTS_DEFAULT_VOICE: af_bella    # Default voice
  KOKORO_SERVICE_URL: http://kokoro:5000

  # Storage
  BOOK_STORAGE_PATH: /app/storage/books
  AUDIO_CACHE_PATH: /app/storage/audio
```

### Available TTS Voices

| Voice ID | Name | Accent |
|----------|------|--------|
| `af_bella` | Bella | American Female |
| `af_nicole` | Nicole | American Female |
| `af_sarah` | Sarah | American Female |
| `af_sky` | Sky | American Female |
| `am_adam` | Adam | American Male |
| `am_michael` | Michael | American Male |
| `bf_emma` | Emma | British Female |
| `bf_isabella` | Isabella | British Female |
| `bm` | British Male | British Male |

---

## GPU Acceleration

GPU acceleration significantly speeds up TTS generation (5-10x faster).

### Requirements

- NVIDIA GPU with CUDA support
- NVIDIA Container Toolkit

### Setup

1. Install NVIDIA Container Toolkit:

```bash
# Add repository
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt update
sudo apt install nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

2. Update `services/kokoro/requirements.txt`:

```txt
flask==3.0.0
kokoro-onnx==0.5.0
numpy>=1.24.0
onnxruntime-gpu>=1.16.0  # Changed from onnxruntime
```

3. Uncomment GPU section in `docker/docker-compose.yml`:

```yaml
kokoro:
  # ... existing config ...
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

4. Rebuild and restart:

```bash
cd docker
docker compose build kokoro
docker compose up -d kokoro
```

### Verify GPU Usage

```bash
# Check if GPU is detected
docker compose exec kokoro python -c "import onnxruntime as ort; print(ort.get_available_providers())"
# Should include 'CUDAExecutionProvider'
```

---

## Reverse Proxy Setup

### Using Caddy (Included)

The included Caddy configuration handles HTTPS automatically. Just update the domain in `Caddyfile`.

### Using nginx

If you prefer nginx, add this to your nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then disable Caddy in `docker-compose.yml` by commenting out the `caddy` service.

### Using Traefik

For Traefik, add labels to services in `docker-compose.yml`:

```yaml
web:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.chapter.rule=Host(`yourdomain.com`)"
    - "traefik.http.routers.chapter.tls.certresolver=letsencrypt"
```

---

## Backup and Restore

### What to Backup

Everything is in a single volume (`chapter_data`):
- SQLite database (`chapter.db`)
- Uploaded books
- Audio cache (optional - can be regenerated)

### Simple Backup

```bash
cd ~/chapter
docker compose cp server:/app/data ./backup-$(date +%Y-%m-%d)
```

### Automated Backup Script

Create `backup.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/backups/chapter"
mkdir -p "$BACKUP_DIR"

cd ~/chapter

# Copy all data (database + books + audio cache)
docker compose cp server:/app/data "$BACKUP_DIR/data-$(date +%Y-%m-%d)"

# Backup config
cp .env "$BACKUP_DIR/env-$(date +%Y-%m-%d).backup"

# Compress
tar -czf "$BACKUP_DIR/chapter-$(date +%Y-%m-%d).tar.gz" \
    -C "$BACKUP_DIR" "data-$(date +%Y-%m-%d)" "env-$(date +%Y-%m-%d).backup"

# Cleanup uncompressed
rm -rf "$BACKUP_DIR/data-$(date +%Y-%m-%d)" "$BACKUP_DIR/env-$(date +%Y-%m-%d).backup"

echo "Backup complete: $BACKUP_DIR/chapter-$(date +%Y-%m-%d).tar.gz"

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
```

Add to crontab for daily backups:

```bash
crontab -e
# Add:
0 2 * * * ~/chapter/backup.sh
```

### Restore from Backup

```bash
cd ~/chapter

# Stop services
docker compose down

# Extract backup
tar -xzf /backups/chapter/chapter-2024-01-15.tar.gz

# Restore data
docker compose cp ./data-2024-01-15 server:/app/data

# Restore config
cp env-2024-01-15.backup .env

# Restart
docker compose up -d
```

---

## Updating Chapter

### Standard Update

```bash
cd ~/chapter
docker compose pull
docker compose up -d
```

That's it. Docker pulls the latest images and restarts the containers.

### Rollback

If something goes wrong, specify a previous version:

```bash
# Edit docker-compose.yml to pin versions, e.g.:
# image: ghcr.io/jordanful/chapter-server:v1.2.3

docker compose up -d
```

---

## Monitoring

### Health Checks

All services have built-in health checks. View status:

```bash
docker compose ps
```

### Manual Health Endpoints

```bash
# API Server
curl http://localhost:3001/health

# TTS Service
curl http://localhost:5001/health

# Database
docker compose exec postgres pg_isready -U chapter

# Redis
docker compose exec redis redis-cli ping
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f server
docker compose logs -f kokoro

# Last 100 lines
docker compose logs --tail 100 server
```

### Resource Usage

```bash
# Container stats
docker stats

# Disk usage
docker system df
df -h
```

---

## Troubleshooting

### Services Won't Start

**Check logs:**
```bash
docker compose logs <service-name>
```

**Common issues:**
- Port already in use: Change ports in `docker-compose.yml`
- Out of memory: Increase server RAM or reduce services
- Disk full: Clear old Docker images with `docker system prune`

### TTS Not Working

**Check Kokoro health:**
```bash
curl http://localhost:5001/health
docker compose logs kokoro
```

**Common issues:**
- Model not downloaded: Check internet connection, restart kokoro service
- Out of memory: Kokoro needs ~500MB RAM
- GPU issues: Verify NVIDIA drivers and container toolkit

### Database Connection Issues

**Check PostgreSQL:**
```bash
docker compose logs postgres
docker compose exec postgres pg_isready -U chapter
```

**Reset database (warning: deletes all data):**
```bash
docker compose down -v
docker compose up -d
```

### Slow TTS Generation

- CPU mode is ~1-2x realtime (normal)
- Enable GPU acceleration for 5-10x speedup
- Reduce concurrent TTS requests
- Check CPU usage with `docker stats`

### "Cannot connect to API" in Browser

**Check:**
1. Server is running: `docker compose ps`
2. Correct API URL in browser network tab
3. CORS settings if using custom domain
4. Firewall allows ports 80/443

### Audio Not Playing

**Check:**
1. TTS service health: `curl http://localhost:5001/health`
2. Audio cache permissions
3. Browser console for errors
4. Network tab for failed requests

### Out of Disk Space

```bash
# Check disk usage
df -h
docker system df

# Clean up Docker
docker system prune -a

# Clear audio cache (will regenerate as needed)
docker compose exec server rm -rf /app/storage/audio/*
```

---

## Security Recommendations

### Production Checklist

- [ ] Change default `POSTGRES_PASSWORD`
- [ ] Generate strong `JWT_SECRET` (use `openssl rand -base64 48`)
- [ ] Enable HTTPS (Caddy does this automatically)
- [ ] Set up firewall (only allow 80/443)
- [ ] Regular backups configured
- [ ] Keep system and Docker updated

### Firewall Setup (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Getting Help

- [GitHub Issues](https://github.com/yourusername/chapter/issues) — Bug reports
- [GitHub Discussions](https://github.com/yourusername/chapter/discussions) — Questions
- [Architecture Docs](ARCHITECTURE.md) — System design details
- [Kokoro TTS Docs](KOKORO.md) — TTS configuration
