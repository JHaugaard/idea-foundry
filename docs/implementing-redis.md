# Implementing Redis for Semantic Search, Backlinking, and Tagging

## Executive Summary

Redis is **highly recommended** for enhancing performance and reducing costs across semantic search, backlinking, and tagging features. Primary benefits include 70-90% reduction in OpenAI API costs, 10-100x faster queries for hot data, and enabling real-time features.

**Current Architecture:** PostgreSQL (Supabase) + pgvector + React Query (client-side caching)
**Recommended Architecture:** Add Redis as a caching layer between Edge Functions and PostgreSQL

---

## Key Use Cases & Benefits

### 1. Semantic Search with Embeddings

**Pain Points:**
- OpenAI `text-embedding-3-small` costs money per API call
- Local embeddings take 1-3 seconds to generate
- No caching for duplicate queries
- pgvector searches can be slow on large datasets

**Redis Solutions:**

#### Embedding Cache (HIGHEST ROI)
```
Key: embedding:{hash(text)}
Value: [0.123, 0.456, ...] (384-dimensional vector)
TTL: 7-30 days
```

**Benefits:**
- 70-90% reduction in OpenAI API costs
- Sub-millisecond retrieval vs. 200-500ms API calls
- Instant response for common searches

#### Search Result Cache
```
Key: search:{query_hash}:{filters}
Value: {results: [...], timestamp, total}
TTL: 5-60 minutes
```

**Benefits:**
- Instant responses for popular queries
- Reduced pgvector computation load
- Better user experience

#### Hot Vector Index (Advanced - Phase 3)
- Use **RedisSearch** with vector similarity for frequently accessed notes
- 10-100x faster than PostgreSQL for top-K queries
- Keep most-viewed note embeddings in memory

---

### 2. Backlinking System

**Current Implementation:**
- PostgreSQL `note_links` table
- AI entity extraction via GPT-4o-mini
- Connection graph queries via JOINs

**Redis Solutions:**

#### Backlink Graph Cache
```
Key: note:links:{note_id}:outgoing → Set of target note IDs
Key: note:backlinks:{note_id} → Set of source note IDs (incoming)
```

**Benefits:**
- O(1) lookup for "What links here?" queries
- Build connection graphs in milliseconds
- Real-time link preview tooltips
- Instant graph traversal vs. PostgreSQL JOINs

#### Entity Extraction Cache
```
Key: entities:{note_id}
Value: {persons: [...], organizations: [...], confidence: 0.85}
TTL: Invalidate on note edit
```

**Benefits:**
- Cache GPT-4o-mini results
- Avoid re-extraction on every view
- Reduce AI API costs

#### Link Autocomplete
```
Key: autocomplete:notes:{prefix}
Value: Sorted Set of matching note titles (scored by relevance)
```

**Benefits:**
- Sub-millisecond `[[Note Ti...]]` suggestions
- Better UX while typing links
- Update on note create/rename

---

### 3. Tagging System

**Current Implementation:**
- 8 PostgreSQL tables (tags, analytics, relationships, preferences)
- AI-powered suggestions via `suggest-tags` Edge Function
- Tag co-occurrence tracking

**Redis Solutions:**

#### Tag Autocomplete
```
Key: tags:autocomplete:{user_id}
Value: Sorted Set scored by frequency
```

**Benefits:**
- Instant tag suggestions from user's library
- Real-time scoring as tags used
- Perfect fit for Sorted Sets

#### Tag Co-occurrence Cache
```
Key: tag:related:{tag_name}
Value: Hash {related_tag: strength_score}
```

**Benefits:**
- Instant "related tags" suggestions
- Cache `tag_relationships` table
- Periodic sync to PostgreSQL

#### AI Tag Suggestion Cache
```
Key: ai:tags:{content_hash}
Value: {tags: [...], confidence: 0.8, model: "gpt-4o-mini"}
TTL: 24 hours
```

**Benefits:**
- Avoid duplicate AI calls for similar content
- Reduce OpenAI costs
- Instant suggestions for repeated content

#### Real-Time Tag Analytics
```
Key: tag:stats:{user_id}:{tag}
Fields: {count, last_used, avg_confidence}
```

**Benefits:**
- Live analytics dashboard updates
- Periodic sync to PostgreSQL for durability
- Track usage in real-time

---

## Recommended Implementation Phases

### Phase 1: Quick Wins (1-2 days) ⭐⭐⭐

**Priority:** HIGH - Immediate cost savings and performance gains

**Implement:**
1. Embedding cache for OpenAI API calls
2. Search result cache (5-minute TTL)
3. Rate limiting for embedding generation

**Expected Impact:**
- 70% reduction in OpenAI API costs
- 5-10x faster repeat searches
- Prevent API quota exhaustion
- Better UX for common queries

**Implementation Scope:**
- Update `supabase/functions/query-embed/index.ts`
- Update `supabase/functions/note-embed/index.ts`
- Add Upstash Redis integration

---

### Phase 2: Performance Optimization (3-5 days) ⭐⭐

**Priority:** MEDIUM-HIGH - Enhanced user experience

**Implement:**
1. Backlink graph caching (Sets for incoming/outgoing links)
2. Tag autocomplete with Sorted Sets
3. Entity extraction cache
4. Link suggestion cache

**Expected Impact:**
- Sub-50ms link graph queries
- Real-time tag suggestions as user types
- Reduced AI API costs for entity extraction
- Smoother link editing experience

**Implementation Scope:**
- Update backlink service (`src/services/`)
- Update tag services
- Add cache invalidation on note edits
- Update autocomplete components

---

### Phase 3: Advanced Features (1-2 weeks) ⭐

**Priority:** MEDIUM - Scale and advanced capabilities

**Implement:**
1. RedisSearch for vector similarity (hot vectors only)
2. RedisGraph for complex link traversal (optional)
3. Real-time analytics aggregation
4. Advanced caching strategies (LRU, probabilistic)

**Expected Impact:**
- 10-100x faster semantic search for hot queries
- Complex graph queries (e.g., "notes 2 hops away")
- Live dashboard updates without PostgreSQL load
- Support for larger datasets

**Implementation Scope:**
- Redis Stack modules integration
- Advanced search algorithms
- Graph traversal optimizations
- Monitoring and alerting

---

## Architecture Recommendation

### Hybrid PostgreSQL + Redis Approach

```
┌──────────────────┐
│     Client       │
│  (React Query)   │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────┐
│  Supabase Edge Functions       │
│                                 │
│  ┌──────────────────────────┐  │
│  │   Redis Cache Layer      │  │ ← NEW
│  │   (Upstash/Redis Cloud)  │  │
│  └───────────┬──────────────┘  │
│              │                  │
│  ┌───────────▼──────────────┐  │
│  │  PostgreSQL + pgvector   │  │
│  │  (Source of Truth)       │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

### Caching Strategy

**Read Path:**
1. Check Redis first (hot data, <50ms)
2. On cache MISS: Query PostgreSQL (100-500ms)
3. Populate Redis with result
4. Return to client

**Write Path:**
1. Write to PostgreSQL (source of truth)
2. Invalidate relevant Redis keys
3. Optional: Eagerly populate cache with new data

**Cache Invalidation Rules:**
- Note edited → Invalidate embeddings, entities, search results
- Link created/deleted → Invalidate backlink graph
- Tag added/removed → Invalidate tag autocomplete, co-occurrence

---

## Specific Redis Data Structures

| Use Case | Redis Type | Key Pattern | Example Value |
|----------|------------|-------------|---------------|
| Embedding cache | String/JSON | `embed:{hash}` | `[0.123, 0.456, ...]` |
| Search results | Hash | `search:{hash}` | `{results: [...], ts: 123}` |
| Backlinks (outgoing) | Set | `note:{id}:links` | `{note456, note789}` |
| Backlinks (incoming) | Set | `note:{id}:backlinks` | `{note123, note456}` |
| Tag autocomplete | Sorted Set | `tags:auto:{uid}` | `{tag: score}` |
| Tag relationships | Hash | `tag:rel:{tag}` | `{related: strength}` |
| Entity cache | JSON | `entities:{nid}` | `{persons: [...]}` |
| Rate limiting | String+TTL | `rl:{uid}:embed` | `5` (count) |

---

## Recommended Redis Provider: Upstash

**Why Upstash?**
- ✅ Serverless pricing (pay per request, not per instance)
- ✅ REST API (works perfectly with Deno Edge Functions)
- ✅ No connection pool management needed
- ✅ Auto-scaling with zero configuration
- ✅ Global replication available
- ✅ Redis 7.x compatible
- ✅ Generous free tier (10K commands/day)

**Cost Estimate:**
- Free tier: Up to 10K requests/day
- Paid tier: ~$0.20 per 100K requests
- Expected cost: **$0-20/month** at current scale

**Alternative:** Redis Cloud ($5-50/month for managed instance)

---

## Implementation Example

### Embedding Cache in Edge Function

```typescript
// supabase/functions/query-embed/index.ts
import { Redis } from '@upstash/redis'
import { createHash } from 'crypto'

const redis = new Redis({
  url: Deno.env.get('UPSTASH_REDIS_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_TOKEN')!,
})

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

async function getEmbedding(text: string): Promise<number[]> {
  const cacheKey = `embed:${hashText(text)}`

  // Try cache first
  const cached = await redis.get<number[]>(cacheKey)
  if (cached) {
    console.log('✅ Embedding cache HIT')
    return cached
  }

  // Cache miss - generate embedding
  console.log('❌ Embedding cache MISS - calling OpenAI')
  const embedding = await generateOpenAIEmbedding(text)

  // Cache for 30 days
  await redis.set(cacheKey, embedding, { ex: 60 * 60 * 24 * 30 })

  return embedding
}
```

### Backlink Cache Example

```typescript
// Cache backlinks when querying
async function getBacklinks(noteId: string): Promise<string[]> {
  const cacheKey = `note:${noteId}:backlinks`

  // Check cache
  const cached = await redis.smembers(cacheKey)
  if (cached.length > 0) {
    return cached
  }

  // Query PostgreSQL
  const { data } = await supabase
    .from('note_links')
    .select('source_note_id')
    .eq('target_note_id', noteId)

  const backlinks = data.map(l => l.source_note_id)

  // Cache as set (TTL 1 hour)
  if (backlinks.length > 0) {
    await redis.sadd(cacheKey, ...backlinks)
    await redis.expire(cacheKey, 3600)
  }

  return backlinks
}

// Invalidate on link creation
async function createLink(sourceId: string, targetId: string) {
  // Write to PostgreSQL
  await supabase.from('note_links').insert({ source_note_id: sourceId, target_note_id: targetId })

  // Invalidate cache
  await redis.del(`note:${sourceId}:links`)
  await redis.del(`note:${targetId}:backlinks`)
}
```

---

## Trade-offs & Considerations

### Pros ✅
- **Massive cost savings** (70-90% reduction in API costs)
- **10-100x faster queries** for frequently accessed data
- **Reduced PostgreSQL load** (better scalability)
- **Real-time features** become feasible (live updates, instant suggestions)
- **Better user experience** (sub-50ms responses)

### Cons ❌
- **Additional infrastructure** to manage (one more service)
- **Cache invalidation complexity** (must handle carefully)
- **Potential consistency issues** (cache vs. database drift)
- **Memory costs** (though minimal with Upstash serverless)
- **Monitoring required** (hit rates, invalidation, errors)

### Mitigation Strategies
1. **Keep PostgreSQL as source of truth** - Redis is cache only
2. **Use short TTLs initially** - Tune based on data
3. **Implement cache versioning** - `v1:embed:{hash}` for easy invalidation
4. **Monitor hit rates** - Ensure cache is effective (>70% target)
5. **Graceful degradation** - Fall back to PostgreSQL if Redis unavailable

---

## Monitoring & Metrics

### Key Metrics to Track

```typescript
{
  // Cache effectiveness
  embeddingCacheHitRate: 85%,      // Goal: >80%
  searchCacheHitRate: 60%,         // Goal: >50%
  backlinkCacheHitRate: 75%,       // Goal: >70%

  // Performance
  avgEmbeddingTime: 15ms,          // Cached vs 200ms API
  avgSearchTime: 45ms,             // Goal: <100ms
  avgBacklinkQueryTime: 20ms,      // Goal: <50ms

  // Cost savings
  openAICalls: 150/day,            // Down from 1000/day
  monthlyCostSavings: $250,        // Track ROI

  // Health
  redisAvailability: 99.9%,
  cacheInvalidationLatency: 50ms,
}
```

### Alerts to Configure
- Cache hit rate drops below 50%
- Redis unavailability
- High eviction rate (memory pressure)
- Abnormal API cost spike (cache failure)

---

## Next Steps

### Pre-Implementation
1. ✅ Set up Upstash Redis account (free tier)
2. ✅ Add `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` to `.env`
3. ✅ Install `@upstash/redis` package
4. ✅ Plan cache invalidation strategy

### Phase 1 Implementation Checklist
- [ ] Implement embedding cache in `query-embed` function
- [ ] Implement embedding cache in `note-embed` function
- [ ] Add rate limiting for embedding generation
- [ ] Update search result caching logic
- [ ] Add monitoring/logging for cache hits/misses
- [ ] Test cache invalidation on note updates
- [ ] Monitor cost savings over 1 week

### Phase 2 Implementation Checklist
- [ ] Implement backlink graph caching
- [ ] Add tag autocomplete with Sorted Sets
- [ ] Cache entity extraction results
- [ ] Update link suggestion logic
- [ ] Test cache invalidation on link/tag changes
- [ ] Optimize TTL values based on usage patterns

### Phase 3 Implementation Checklist
- [ ] Evaluate Redis Stack for vector similarity
- [ ] Implement hot vector caching
- [ ] Add RedisGraph for complex queries (if needed)
- [ ] Build real-time analytics aggregation
- [ ] Load testing and optimization
- [ ] Production monitoring dashboard

---

## References

### Documentation
- [Upstash Redis Docs](https://upstash.com/docs/redis)
- [RedisSearch Vector Similarity](https://redis.io/docs/stack/search/reference/vectors/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)

### Related Project Files
- `supabase/functions/query-embed/index.ts` - Query embedding generation
- `supabase/functions/note-embed/index.ts` - Note embedding generation
- `supabase/functions/extract-backlinks/index.ts` - Entity extraction
- `supabase/functions/suggest-tags/index.ts` - AI tag suggestions
- `src/hooks/useEnhancedSearch.tsx` - Hybrid search logic
- `src/services/localEmbedding.ts` - Local embedding service

### Current Architecture Docs
- `docs/core_functionality.md` - Core feature descriptions
- `docs/infrastructure-reference.md` - Infrastructure decisions

---

## Decision Log

**Date:** 2025-10-31
**Status:** RECOMMENDED - Awaiting implementation phase
**Rationale:** Redis provides significant cost savings (70-90% API reduction), performance improvements (10-100x faster queries), and enables real-time features. Upstash's serverless model aligns perfectly with Supabase Edge Functions architecture.

**Risks:** Cache invalidation complexity, additional infrastructure dependency
**Mitigation:** Keep PostgreSQL as source of truth, implement graceful degradation, monitor cache effectiveness

**Next Review:** After Phase 1 implementation (measure actual cost savings and performance gains)
