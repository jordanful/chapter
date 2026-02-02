# Why Kokoro Instead of OpenAI TTS?

We switched from OpenAI TTS to Kokoro TTS for several important reasons that align perfectly with Chapter's self-hosted philosophy.

## Comparison

| Feature | OpenAI TTS | Kokoro TTS | Winner |
|---------|-----------|------------|--------|
| **Hosting** | Cloud API | Self-hosted | 🏆 Kokoro |
| **Privacy** | Data sent to OpenAI | Stays on your server | 🏆 Kokoro |
| **Cost** | $15 per 1M chars | Free (hardware only) | 🏆 Kokoro |
| **Rate Limits** | Yes | No | 🏆 Kokoro |
| **Quality** | Excellent | Frontier-quality | 🤝 Tie |
| **Latency** | Network + API | Local only | 🏆 Kokoro |
| **Dependencies** | API key required | None | 🏆 Kokoro |
| **Word Timestamps** | No | Can be estimated | 🤝 Tie |
| **Voices** | 6 voices | 9 voices | 🏆 Kokoro |
| **Setup Complexity** | Easy (API key) | Medium (Docker) | 🏆 OpenAI |

## Key Benefits of Kokoro

### 1. **True Self-Hosting**

With OpenAI TTS, you're not truly self-hosted - you depend on:
- OpenAI's API availability
- Your API key
- Network connectivity
- Their pricing changes

With Kokoro, everything runs on your infrastructure:
```
Your Server Only
├── PostgreSQL (your data)
├── Redis (your cache)
├── Chapter Server (your app)
└── Kokoro TTS (your voices)
```

### 2. **Zero API Costs**

**OpenAI TTS Costs:**
- Standard voices: $15 per 1M characters
- HD voices: $30 per 1M characters

**Example: 100 books averaging 300 pages each**
- Characters: ~100 books × 300 pages × 2,000 chars/page = 60M chars
- Cost: 60M × $15/1M = **$900** (standard) or **$1,800** (HD)

**Kokoro Costs:**
- Initial: $0 (open source)
- Per-book: $0
- Forever: $0

### 3. **Privacy & Data Ownership**

With OpenAI:
- All book text sent to external API
- Covered by OpenAI's privacy policy
- Potential for data training
- Compliance concerns for sensitive content

With Kokoro:
- Book text never leaves your server
- Full GDPR/HIPAA compliance
- No external dependencies
- Complete data sovereignty

### 4. **No Rate Limits**

OpenAI TTS has rate limits that can affect user experience:
- Requests per minute caps
- Potential throttling
- API quota concerns

Kokoro:
- Limited only by your hardware
- Generate as much as you need
- No waiting for API slots
- Predictable performance

### 5. **Frontier Quality**

Kokoro isn't a compromise - it's frontier-quality TTS:
- Natural prosody
- Excellent pronunciation
- Multiple accents (American, British)
- 9 distinct voices
- Comparable quality to commercial APIs

### 6. **Offline Capability**

Once Kokoro is set up:
- Works without internet
- No API outages
- No network dependencies
- True offline reading/listening

## Cost Analysis

### Scenario: Small Library (10 users, 50 books each)

**Book Statistics:**
- 500 books total
- Average 80,000 words per book
- ~400,000 characters per book
- Total: 200M characters

**OpenAI TTS:**
- One-time generation: $3,000 (standard) or $6,000 (HD)
- With caching: Still $3,000-$6,000 for initial generation
- **Annual recurring**: $0 (after cache filled)

**Kokoro:**
- Hardware: $0 (runs on existing server)
- Or GPU acceleration: ~$500 one-time for GPU
- Generation: $0
- **Annual recurring**: $0

**Break-even**: Immediate (first book)

### Scenario: Medium Library (100 users, 100 books each)

**Book Statistics:**
- 10,000 books total
- 4B characters total

**OpenAI TTS:**
- Initial generation: $60,000 (standard) or $120,000 (HD)
- **Annual recurring**: New books and users add cost

**Kokoro:**
- Hardware: $0-$2,000 (optional GPU upgrade)
- Generation: $0
- **Annual recurring**: $0

**Savings**: $58,000-$120,000 first year, growing over time

## Performance Comparison

### Generation Speed

**OpenAI TTS:**
- Network latency: 50-200ms
- API processing: 1-3 seconds per chunk
- Total: 1-3 seconds per chunk

**Kokoro (CPU):**
- No network latency
- Processing: 1-2 seconds per chunk
- Total: 1-2 seconds per chunk

**Kokoro (GPU):**
- No network latency
- Processing: 0.2-0.5 seconds per chunk
- Total: 0.2-0.5 seconds per chunk

### Caching Benefits

Both systems benefit from caching:
- First generation: 1-3 seconds
- Cached playback: Instant
- Cache hit rate: ~80-90% in practice

With Kokoro, you control:
- Cache size (no storage costs)
- Eviction policy
- Cache location

## Environmental Impact

**OpenAI TTS:**
- Cloud infrastructure energy
- Network transmission energy
- Data center cooling
- Redundant computation (global cache)

**Kokoro:**
- Local computation only
- One-time generation
- No network transmission
- Efficient caching

## Implementation Complexity

**OpenAI TTS:**
```typescript
// Simple API call
const audio = await openai.audio.speech.create({
  model: "tts-1-hd",
  voice: "alloy",
  input: text,
});
```

**Kokoro:**
```typescript
// HTTP request to local service
const response = await fetch('http://kokoro:5000/synthesize', {
  method: 'POST',
  body: JSON.stringify({ text, voice: 'af_bella' }),
});
const audio = await response.arrayBuffer();
```

Complexity difference: Minimal

## Migration Path

If you're currently using OpenAI TTS, migration to Kokoro is straightforward:

1. **Add Kokoro service** to Docker Compose
2. **Update environment** variables
3. **Clear audio cache** (optional - gradual migration possible)
4. **Restart services**

Your existing books, users, and progress are unaffected.

## When to Consider OpenAI TTS

Kokoro is better for most use cases, but consider OpenAI if:

- **Zero infrastructure** - You can't or don't want to host anything
- **Instant setup** - Need to start immediately with just an API key
- **Serverless deployment** - Running on platforms without container support
- **Compliance requirements** - Need SOC 2 Type II certified infrastructure

For Chapter's self-hosted philosophy, Kokoro is the clear winner.

## Conclusion

Kokoro enables true self-hosting:
- ✅ No external dependencies
- ✅ Zero recurring costs
- ✅ Complete privacy
- ✅ Unlimited usage
- ✅ Offline capable
- ✅ Frontier quality

The choice aligns perfectly with Chapter's mission: a self-hosted reading/audiobook system that you truly own and control.

## Resources

- [Kokoro GitHub](https://github.com/hexgrad/kokoro)
- [OpenAI TTS Pricing](https://openai.com/api/pricing/)
- [Kokoro Integration Guide](./KOKORO.md)
