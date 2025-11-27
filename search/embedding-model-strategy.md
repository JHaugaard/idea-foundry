# Embedding Model Lock-In and Migration Strategy

## Executive Summary

**Yes, you are essentially locked into your embedding model choice.** Different embedding models produce vectors in incompatible vector spaces - you cannot mix embeddings from `nomic-embed-text` with OpenAI's `text-embedding-3-small` in the same search operation. Switching models requires re-embedding your entire corpus.

However, this lock-in can be mitigated with proper architecture and planning.

## The Technical Reality

### Why Models Are Incompatible

1. **Different Vector Dimensions**
   - `nomic-embed-text`: 768 dimensions (or configurable)
   - `text-embedding-3-small`: 1536 dimensions (configurable down to 512)
   - OpenAI `text-embedding-3-large`: 3072 dimensions
   - Vectors of different dimensions cannot be compared

2. **Different Vector Spaces**
   - Even if dimensions match, each model learns a unique semantic space
   - Distances/similarities between vectors are only meaningful within the same model's space
   - A 0.85 cosine similarity in one model ≠ 0.85 in another

3. **Different Training Data & Objectives**
   - Models encode semantic relationships differently
   - "Similar" concepts may be far apart in one space, close in another
   - Threshold tuning (e.g., your 0.78 similarity threshold) is model-specific

### What Happens If You Switch

**Scenario**: You have 1,000 notes embedded with `nomic-embed-text`, want to switch to OpenAI

**Required Actions**:
- Re-embed all 1,000 notes with the new model
- Update your `note_embeddings` table schema (if dimensions change)
- Re-tune your similarity threshold (0.78 may no longer be appropriate)
- Re-calibrate your hybrid search weights (60/40 semantic/fuzzy may shift)
- Potentially re-generate cached embeddings in Redis

**Cannot Do**:
- Mix old `nomic-embed-text` embeddings with new OpenAI query embeddings
- Use existing embeddings with a different model
- Incrementally migrate (all-or-nothing switch)

## Mitigation Strategies

### 1. **Design for Model Flexibility From Day One**

**Database Schema**:
```sql
-- Add model tracking to your embeddings table
ALTER TABLE note_embeddings
  ADD COLUMN embedding_model VARCHAR(100),
  ADD COLUMN model_version VARCHAR(50),
  ADD COLUMN embedding_dimensions INTEGER;

-- Create index for efficient filtering
CREATE INDEX idx_embedding_model ON note_embeddings(embedding_model);
```

**Benefits**:
- Track which model generated each embedding
- Support multiple models simultaneously (A/B testing)
- Clear audit trail for migrations
- Enable gradual rollouts

### 2. **Multi-Model Support Architecture**

Instead of locking into one model, support multiple embedding strategies:

```typescript
// Embedding provider abstraction
interface EmbeddingStrategy {
  model: string;
  dimensions: number;
  generateEmbedding(text: string): Promise<number[]>;
  similarityThreshold: number;
}

const MODELS = {
  'nomic-local': {
    model: 'nomic-embed-text',
    dimensions: 768,
    threshold: 0.78,
    provider: 'ollama'
  },
  'openai-small': {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    threshold: 0.82, // would need tuning
    provider: 'openai'
  }
};
```

**Benefits**:
- Switch models for new content without re-embedding old content
- Run parallel experiments (e.g., compare model quality)
- Gradually migrate corpus in background
- Fall back if primary model fails

### 3. **Incremental Migration Strategy**

**Phased Approach**:
1. Add new model alongside existing (dual-embedding)
2. Background job: Re-embed notes incrementally (e.g., 100/day)
3. Search queries use "best available" embedding per note
4. Once 100% migrated, deprecate old model
5. Clean up old embeddings

**Implementation**:
```typescript
// Search logic supports multiple models
async function semanticSearch(query: string) {
  // Generate query embedding for ALL supported models
  const queryEmbeddings = await Promise.all([
    generateNomic(query),
    generateOpenAI(query)
  ]);

  // Search uses model-specific embeddings
  const results = await db.query(`
    SELECT n.*,
      CASE
        WHEN ne.embedding_model = 'nomic'
          THEN 1 - (ne.embedding <=> $1)
        WHEN ne.embedding_model = 'openai'
          THEN 1 - (ne.embedding <=> $2)
      END as similarity
    FROM notes n
    JOIN note_embeddings ne ON n.id = ne.note_id
    WHERE (
      (ne.embedding_model = 'nomic' AND 1 - (ne.embedding <=> $1) > 0.78)
      OR (ne.embedding_model = 'openai' AND 1 - (ne.embedding <=> $2) > 0.82)
    )
    ORDER BY similarity DESC
  `, [queryEmbeddings.nomic, queryEmbeddings.openai]);
}
```

### 4. **Migration Automation**

**Background Re-Embedding Job**:
```typescript
// Incremental migration script
async function migrateEmbeddings(
  fromModel: string,
  toModel: string,
  batchSize: number = 50
) {
  const pending = await db.query(`
    SELECT id, content
    FROM notes n
    WHERE NOT EXISTS (
      SELECT 1 FROM note_embeddings ne
      WHERE ne.note_id = n.id
      AND ne.embedding_model = $1
    )
    LIMIT $2
  `, [toModel, batchSize]);

  for (const note of pending) {
    const embedding = await generateEmbedding(note.content, toModel);
    await db.query(`
      INSERT INTO note_embeddings (note_id, embedding, embedding_model)
      VALUES ($1, $2, $3)
    `, [note.id, embedding, toModel]);
  }

  return pending.length; // 0 when complete
}
```

### 5. **Cost/Performance Monitoring**

Track migration impact:
- Embedding generation costs (OpenAI charges per token)
- Storage costs (multiple embeddings = more storage)
- Query latency (dual-model search slower)
- Search quality metrics (A/B comparison)

## Decision Framework

### When to Accept Lock-In

**Choose one model and commit if**:
- You have < 10,000 notes (re-embedding is cheap/fast)
- Model performance clearly superior for your use case
- Cost is negligible (local Ollama = free)
- Simplicity > flexibility for your learning goals

**Best for**: Rapid iteration, single-user systems, learning projects

### When to Design for Flexibility

**Multi-model architecture if**:
- Large corpus (>100,000 notes) makes re-embedding expensive
- Embedding quality critically impacts user experience
- You want to experiment with latest models
- Building a production system or long-term knowledge base

**Best for**: Production systems, large-scale corpora, research projects

## Specific Recommendations for Your Project

### Context
- **Current State**: Dual embedding support (local `mxbai-embed-xsmall-v1` + OpenAI `text-embedding-3-small`)
- **Scale**: Single user, personal knowledge base (likely < 50,000 notes)
- **Goals**: Learning-focused, "best and coolest" search capabilities
- **Infrastructure**: Homelab with Ollama (free local inference)

### Recommendation: **Pragmatic Flexibility**

1. **Choose Your Primary Model Now**
   - **For learning + local-first**: `nomic-embed-text` (768-dim, excellent quality, free, privacy)
   - **For bleeding-edge quality**: OpenAI `text-embedding-3-large` (3072-dim, best-in-class, ~$0.13/1M tokens)
   - **For balance**: OpenAI `text-embedding-3-small` (1536-dim, great quality, ~$0.02/1M tokens)

2. **Add Model Metadata to Schema** ✅
   - Track `embedding_model` and `dimensions` in `note_embeddings` table
   - Enables future flexibility without over-engineering today

3. **Accept Lock-In for Now, Plan for Migration**
   - Use ONE model for all embeddings initially
   - Document migration procedure (see script above)
   - Re-embedding 10K notes later = minutes/hours, not days

4. **Monitor Model Evolution**
   - Embedding models improve rapidly (GPT-4 → GPT-5, new Nomic versions)
   - Set calendar reminder (quarterly?) to evaluate new models
   - Re-embed corpus if quality improvement justified

### Model Selection Criteria

| Model | Dimensions | Cost | Quality | Privacy | Speed | Verdict |
|-------|------------|------|---------|---------|-------|---------|
| `nomic-embed-text` (Ollama) | 768 | Free | Excellent | Local | Fast | **Best for learning + homelab** |
| `text-embedding-3-small` | 1536 | $0.02/1M | Excellent | Cloud | Fast | Balanced option |
| `text-embedding-3-large` | 3072 | $0.13/1M | Best | Cloud | Slow | Overkill for personal use |
| `mxbai-embed-xsmall-v1` | 384 | Free | Good | Local | Fastest | Lower quality, fast prototyping |

**My Recommendation**: Start with `nomic-embed-text` via Ollama
- **Why**: Free, private, excellent quality, leverages your homelab, aligns with "learning and sophistication" goals
- **Trade-off**: Slightly lower quality than OpenAI large models (but marginal for personal knowledge base)
- **Migration Path**: Easy to re-embed later if needed (corpus likely small enough)

## Implementation Checklist

### Immediate Actions
- [ ] Decide on primary embedding model
- [ ] Add `embedding_model`, `model_version`, `embedding_dimensions` columns to `note_embeddings`
- [ ] Update embedding generation functions to record model metadata
- [ ] Document chosen model + rationale in `search/session.context.md`

### Nice-to-Have (Future Flexibility)
- [ ] Create embedding provider abstraction layer
- [ ] Implement multi-model search support (parallel queries)
- [ ] Build background migration job script
- [ ] Add model performance comparison dashboard

### Long-Term Monitoring
- [ ] Track embedding costs (if using OpenAI)
- [ ] Monitor search quality metrics by model
- [ ] Quarterly review: Are there better models available?
- [ ] Re-embed corpus when quality improvement justifies effort

## Key Files to Modify

1. **Database Schema**:
   - Create migration to add model tracking columns
   - Location: `supabase/migrations/`

2. **Embedding Generation**:
   - `supabase/functions/note-embed/index.ts` (note embeddings)
   - `supabase/functions/query-embed/index.ts` (query embeddings)
   - Add model metadata to insertions

3. **Provider Abstraction** (optional):
   - `src/hooks/useEmbeddingProvider.tsx` (current local/cloud switch)
   - Extend to support model selection + metadata

4. **Search Logic**:
   - `src/hooks/useEnhancedSearch.tsx` (main search)
   - Ensure compatibility with model metadata

## Conclusion

**TL;DR**:
- ✅ Yes, you're locked into your embedding model choice (vectors are incompatible)
- ✅ BUT: Re-embedding is cheap/fast for personal-scale corpora (< 50K notes)
- ✅ Mitigate with model metadata tracking in your schema TODAY
- ✅ Choose `nomic-embed-text` (local, free, excellent) or `text-embedding-3-small` (cloud, cheap, excellent)
- ✅ Accept lock-in for now, plan migration procedure for later
- ✅ Your corpus is likely small enough that switching models later = low cost

**Next Step**: Decide on your primary model, then proceed with schema changes and metadata tracking.
