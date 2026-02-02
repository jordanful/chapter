# Chapter Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chapter System                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │   Web Client │ ◄─────► │    Caddy     │                      │
│  │  (Next.js)   │  HTTPS  │ (Reverse     │                      │
│  │              │         │  Proxy)      │                      │
│  └──────────────┘         └──────┬───────┘                      │
│                                   │                              │
│                          ┌────────▼────────┐                     │
│                          │  Chapter Server │                     │
│                          │   (Fastify)     │                     │
│                          └────┬───┬───┬────┘                     │
│                               │   │   │                          │
│            ┌──────────────────┘   │   └─────────────┐            │
│            │                      │                 │            │
│       ┌────▼────┐         ┌───────▼──────┐   ┌─────▼──────┐    │
│       │PostgreSQL│         │   Redis      │   │   Kokoro   │    │
│       │  (Data)  │         │  (Cache)     │   │    TTS     │    │
│       └──────────┘         └──────────────┘   └────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Web Client (Next.js)

**Purpose**: User interface for reading books and listening to audiobooks

**Technology**:
- Next.js 14 with App Router
- React 18
- Tailwind CSS + shadcn/ui
- Zustand (state management)
- TanStack Query (API calls)
- Howler.js (audio playback)

**Key Features**:
- Server-side rendering
- Responsive design
- Dark mode support
- Offline-capable (future)

**Routes**:
- `/` - Landing page
- `/login` - Authentication
- `/library` - Book library
- `/reader/:bookId` - Reading interface
- `/settings` - User preferences

### 2. API Server (Fastify)

**Purpose**: Backend API handling all business logic

**Technology**:
- Node.js 20
- Fastify 4 (high-performance HTTP server)
- Prisma (ORM)
- JWT authentication
- TypeScript

**Modules**:

#### Auth Module
- User registration and login
- JWT token generation and validation
- Password hashing (bcrypt)
- Session management

#### Books Module
- EPUB upload and parsing
- Book metadata extraction
- Chapter and paragraph storage
- Tokenization
- Cover image handling

#### Progress Module
- Multi-level position tracking
- Reading/audiobook mode switching
- Position synchronization
- Session time tracking

#### TTS Module
- Kokoro service integration
- Voice management
- Audio chunk generation
- Cache management

#### Users Module
- User profile management
- Settings (TTS, reading preferences)
- User-book relationships

### 3. SQLite Database

**Purpose**: Primary data store (embedded, zero-config)

**Schema**:

```sql
Users (authentication, preferences)
  ├── UserBooks (user-book junction)
  └── ReadingProgress (position tracking)

Books (metadata, statistics)
  ├── Chapters (structured content)
  │   └── Paragraphs (tokenized text)
  └── TTSCache (audio cache)
```

**Why SQLite**:
- Zero configuration - just a file
- No separate database server to manage
- Simple backups (copy one file)
- Perfect for self-hosted use case
- Handles concurrent reads well

**Indexes**:
- Primary keys on all tables
- Foreign key indexes for relationships
- Composite indexes for common queries

### 4. Redis Cache

**Purpose**: High-speed caching and session storage

**Usage**:
- Session data
- Frequently accessed book metadata
- User preferences cache
- Rate limiting counters
- Temporary TTS job state

**TTL Strategy**:
- Sessions: 7 days
- Metadata: 1 hour
- Preferences: 24 hours

### 5. Kokoro TTS Service

**Purpose**: Text-to-speech generation

**Technology**:
- Python 3.11
- Flask (HTTP server)
- Kokoro ONNX model
- ONNX Runtime

**API**:
- `POST /synthesize` - Generate audio
- `GET /voices` - List voices
- `GET /health` - Health check

**Performance**:
- CPU: ~1-2x realtime
- GPU: ~5-10x realtime
- Model cache: ~500MB-2GB

### 6. Caddy Reverse Proxy

**Purpose**: TLS termination and routing

**Features**:
- Automatic HTTPS
- HTTP/2 support
- Load balancing (future)
- Rate limiting (future)

**Routes**:
- `/api/*` → Chapter Server
- `/*` → Web Client

## Data Flow

### Book Upload Flow

```
User uploads EPUB
       ↓
[Web Client] POST /api/books (multipart)
       ↓
[API Server] Receives file
       ↓
[EPUB Parser] Extracts metadata, chapters
       ↓
[Tokenizer] Splits into words/punctuation
       ↓
[Database] Stores structured data
       ↓
[Storage] Saves EPUB file and cover
       ↓
[Response] Returns book metadata
       ↓
[Web Client] Displays book in library
```

### Reading Flow

```
User opens book
       ↓
[Web Client] GET /api/books/:id/chapter/0
       ↓
[API Server] Fetches chapter + paragraphs
       ↓
[Database] Returns tokenized content
       ↓
[Response] JSON with chapter data
       ↓
[Web Client] Renders readable text
       ↓
User scrolls (position tracked)
       ↓
[Web Client] PUT /api/progress/:bookId
       ↓
[API Server] Updates position
       ↓
[Database] Saves multi-level position
```

### TTS Generation Flow

```
User switches to audiobook mode
       ↓
[Web Client] Requests audio for current position
       ↓
[API Server] GET /api/tts/audio/:chunkId
       ↓
[Cache Check] Hash = f(text + voice + settings)
       ↓
Cache Hit?
├─ Yes → [Storage] Read cached WAV file
│          ↓
│       [Response] Stream audio
│          ↓
│       [Web Client] Play audio
│
└─ No → [API Server] POST to Kokoro service
         ↓
      [Kokoro] Generate speech via ONNX
         ↓
      [Response] WAV audio data
         ↓
      [Storage] Cache WAV file
         ↓
      [Database] Store cache metadata
         ↓
      [Response] Stream audio
         ↓
      [Web Client] Play audio
```

## Security Architecture

### Authentication Flow

```
1. User registers/logs in
2. Server validates credentials
3. Server generates JWT (7-day expiration)
4. Client stores token (httpOnly cookie or localStorage)
5. Client includes token in Authorization header
6. Server validates token on each request
7. Token refresh before expiration
```

### Authorization

- **User-Book Access**: Users can only access their own books
- **Admin Routes**: Future admin panel (not implemented)
- **Rate Limiting**: Future implementation

### Data Protection

- **Passwords**: bcrypt hashed (10 rounds)
- **JWT Secrets**: Environment variable (must be changed in production)
- **File Upload**: Validated file type, size limit
- **SQL Injection**: Prevented by Prisma ORM

## Storage Architecture

### File System Layout

```
/app/storage/
├── books/
│   ├── {hash}.epub          # Original EPUB files
│   └── {hash}-cover.jpg     # Cover images
└── audio/
    ├── {chunkHash}.wav      # Cached TTS audio
    └── {chunkHash}.wav
```

### Deduplication

- **Books**: SHA-256 hash of EPUB content
- **Audio**: Hash of (text + voice + settings)
- Shared books don't duplicate storage

### Cache Management

- **Max Size**: Configurable (default 10GB)
- **Eviction**: LRU (least recently used)
- **Cleanup**: Background job (future)

## Scalability Considerations

### Current Architecture

- **Users**: Hundreds (single server)
- **Books**: Thousands (limited by disk)
- **Concurrent TTS**: 1-5 requests (CPU/GPU dependent)

### Future Scaling Options

1. **Horizontal Scaling**:
   - Multiple API servers behind load balancer
   - Shared PostgreSQL and Redis
   - Distributed file storage (S3, MinIO)

2. **TTS Scaling**:
   - Multiple Kokoro instances
   - Queue-based job processing
   - Dedicated TTS workers

3. **Database Scaling**:
   - Read replicas for queries
   - Connection pooling
   - Partitioning by user/book

4. **Caching Improvements**:
   - CDN for static assets
   - Redis cluster
   - Edge caching

## Deployment Architecture

### Docker Compose (Current)

```yaml
services:
  redis (cache)
  kokoro (TTS)
  server (API + SQLite)
  web (UI)
  caddy (proxy)
```

### Production Recommendations

1. **Separate Databases**: Dedicated PostgreSQL/Redis servers
2. **TTS Workers**: Multiple Kokoro instances
3. **Load Balancing**: Multiple API/web servers
4. **Monitoring**: Prometheus + Grafana
5. **Backups**: Automated PostgreSQL backups

## Monitoring Points

### Health Checks

- `/health` - API server
- `/api/tts/health` - TTS service
- Database connection
- Redis connection
- Disk space

### Metrics to Track

- Request latency (p50, p95, p99)
- TTS generation time
- Cache hit rate
- Active users
- Books uploaded
- Storage usage
- Error rates

## Technology Choices Rationale

### Fastify vs Express
- 2-3x faster
- Built-in TypeScript support
- Modern plugin system
- Better async/await handling

### Prisma vs TypeORM
- Better TypeScript integration
- Auto-generated types
- Migration system
- Cleaner query API

### Kokoro vs OpenAI TTS
- Self-hosted (privacy, cost)
- No API dependencies
- Frontier quality
- See [WHY_KOKORO.md](./WHY_KOKORO.md)

### Turborepo vs Nx
- Simpler configuration
- Faster builds
- Better caching
- Active development

### Next.js vs Remix/SvelteKit
- Larger ecosystem
- Better documentation
- Server components
- Vercel optimization (optional)

## Future Architecture Improvements

1. **WebSockets**: Real-time progress sync across devices
2. **Message Queue**: Background job processing (RabbitMQ, Redis Queue)
3. **CDN Integration**: Static asset delivery
4. **Microservices**: Separate TTS, EPUB processing services
5. **GraphQL**: Flexible API queries
6. **Edge Functions**: Serverless API endpoints
7. **Service Mesh**: Inter-service communication (Kubernetes)

## Development vs Production

### Development

- Hot reloading (tsx, next dev)
- Debug logging
- Source maps
- Local databases
- HTTP (no TLS)

### Production

- Compiled builds
- Minimal logging
- Minified code
- Remote databases
- HTTPS (Caddy)
- Health checks
- Graceful shutdown

## Disaster Recovery

### Backup Strategy

1. **Database**: Daily PostgreSQL dumps
2. **EPUB Files**: Sync to S3/backup storage
3. **Audio Cache**: Regeneratable, don't backup
4. **Configuration**: Version controlled

### Recovery Plan

1. Restore PostgreSQL from backup
2. Restore EPUB files from backup
3. Restart services
4. Regenerate audio cache as needed

### RTO/RPO

- **RTO**: 1 hour (time to restore)
- **RPO**: 24 hours (daily backups)
- Improve with continuous replication

---

For more information:
- [Self-Hosting Guide](./SELF_HOSTING.md)
- [Kokoro TTS Integration](./KOKORO.md)
- [Why Kokoro?](./WHY_KOKORO.md)
- [Contributing Guide](../CONTRIBUTING.md)
