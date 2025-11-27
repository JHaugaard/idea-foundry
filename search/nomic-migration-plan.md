# Nomic-Embed-Text Migration Plan (v1.0)

## Decision Summary

**Locked Model Choice**: `nomic-embed-text` via Ollama on Homelab (768 dimensions)
- **Endpoint**: `https://ollama.haugaard.dev` (from homelab-summary.xml)
- **Approach**: Environment variable configuration with hard removal of OpenAI alternative
- **Data Status**: No production data - fresh start approved
- **Migration**: Delete existing embeddings, start clean with 768-dim schema

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

---

## Implementation Plan

### Phase 1: Database Schema Migration (Breaking Change)

**Goal**: Update schema from 1536-dim (OpenAI placeholder) to 768-dim (Nomic) with metadata tracking

**New Migration File**: `supabase/migrations/[timestamp]_migrate_to_nomic_768.sql`

**Actions**:

1. **Add model metadata columns** to `note_embeddings`:
   ```sql
   ALTER TABLE note_embeddings
     ADD COLUMN embedding_model VARCHAR(100) DEFAULT 'nomic-embed-text',
     ADD COLUMN model_version VARCHAR(50) DEFAULT 'latest',
     ADD COLUMN embedding_dimensions INTEGER DEFAULT 768;
   ```

2. **Truncate existing data** (no production data to preserve):
   ```sql
   TRUNCATE TABLE note_embeddings CASCADE;
   ```

3. **Update vector dimension** (breaking change):
   ```sql
   ALTER TABLE note_embeddings
     ALTER COLUMN embedding TYPE vector(768);
   ```

4. **Recreate search function** with new dimensions:
   ```sql
   CREATE OR REPLACE FUNCTION match_notes(
     query_embedding vector(768),  -- Changed from 1536
     match_threshold float,
     match_count int,
     filter_user_id uuid
   )
   -- ... rest of function with updated signature
   ```

5. **Recreate vector index**:
   ```sql
   DROP INDEX IF EXISTS note_embeddings_embedding_idx;
   CREATE INDEX note_embeddings_embedding_idx
     ON note_embeddings
     USING ivfflat (embedding vector_cosine_ops)
     WITH (lists = 100);
   ```

6. **Add index for model tracking**:
   ```sql
   CREATE INDEX idx_embedding_model ON note_embeddings(embedding_model);
   ```

**Critical Files**:
- All existing migrations referencing `vector(1536)` remain unchanged (historical record)
- New migration creates clean 768-dim schema

---

### Phase 2: Edge Functions - Replace OpenAI with Ollama

**Goal**: Update both Edge Functions to call Ollama instead of OpenAI

#### 2A. Create Shared Embedding Provider

**New File**: `supabase/functions/_shared/ollama-provider.ts`

**Implementation**:
```typescript
interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

export async function generateOllamaEmbedding(
  text: string,
  baseUrl: string = Deno.env.get('OLLAMA_BASE_URL') || 'https://ollama.haugaard.dev'
): Promise<number[]> {
  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      prompt: text,
    } as OllamaEmbeddingRequest),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding failed: ${response.statusText}`);
  }

  const data: OllamaEmbeddingResponse = await response.json();

  // Validate dimensions
  if (data.embedding.length !== 768) {
    throw new Error(`Expected 768 dimensions, got ${data.embedding.length}`);
  }

  return data.embedding;
}
```

**Why Shared**:
- Both `note-embed` and `query-embed` use identical logic
- Single source of truth for Ollama integration
- Easier to update if Ollama API changes

#### 2B. Update `note-embed` Edge Function

**File**: `supabase/functions/note-embed/index.ts`

**Changes**:

1. **Remove OpenAI dependency**:
   ```typescript
   // DELETE: import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts'
   // ADD: import { generateOllamaEmbedding } from '../_shared/ollama-provider.ts'
   ```

2. **Replace embedding generation** (lines ~90-100):
   ```typescript
   // OLD (DELETE):
   // const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })
   // const response = await openai.embeddings.create({
   //   model: "text-embedding-3-small",
   //   input: content,
   //   dimensions: 384,
   // })
   // const embedding = response.data[0].embedding

   // NEW:
   const embedding = await generateOllamaEmbedding(content);
   ```

3. **Update database insertion** (add metadata):
   ```typescript
   const { error: embeddingError } = await supabaseAdmin
     .from('note_embeddings')
     .upsert({
       note_id: noteId,
       user_id: userId,
       embedding,
       embedding_model: 'nomic-embed-text',
       model_version: 'latest',
       embedding_dimensions: 768,
     });
   ```

4. **Remove `OPENAI_API_KEY` requirement** from error messages/validation

#### 2C. Update `query-embed` Edge Function

**File**: `supabase/functions/query-embed/index.ts`

**Changes** (identical to note-embed):

1. Import shared Ollama provider
2. Replace OpenAI call with `generateOllamaEmbedding(query)`
3. Update dimensions validation (768 instead of 384)
4. Remove OpenAI dependency

---

### Phase 3: Client-Side Embedding Service

**Goal**: Simplify or remove client-side local embedding (optional for v1.0)

**Option A (Recommended for v1.0)**: **Simplify - Always Use Ollama**
- Remove local browser-based embedding entirely
- All embeddings go through Ollama (via Edge Functions)
- Simpler architecture, consistent model usage

**File Changes**:

1. `src/hooks/useEmbeddingProvider.tsx`:
   - Remove `'local'` and `'auto'` modes
   - Always use `'ollama'` (via query-embed Edge Function)
   - Simplify to single code path

2. `src/services/localEmbedding.ts`:
   - **Option**: Delete entirely (not needed)
   - **Alternative**: Keep for future local experimentation

**Option B (Future Enhancement)**: **Keep Local, Use Nomic-Compatible Model**
- Replace `mxbai-embed-xsmall-v1` (384-dim) with compatible 768-dim model
- Requires finding Transformers.js-compatible Nomic model
- More complex, defer to post-v1.0

**Recommendation**: Choose Option A for v1.0 simplicity

---

### Phase 4: Environment Configuration

**Goal**: Add Ollama configuration, remove OpenAI requirement

**Files to Update**:

1. **`.env.example`** (template):
   ```bash
   # Embedding Provider (Ollama)
   OLLAMA_BASE_URL=https://ollama.haugaard.dev

   # Remove or comment out:
   # OPENAI_API_KEY=sk-...  # No longer required
   ```

2. **Supabase Edge Function Secrets** (via Supabase dashboard):
   - Add: `OLLAMA_BASE_URL` = `https://ollama.haugaard.dev`
   - Remove: `OPENAI_API_KEY` (no longer needed)

3. **Documentation**:
   - Update `search/session.context.md` with new embedding model choice
   - Document Ollama endpoint in setup instructions

---

### Phase 5: Search Logic Updates

**Goal**: Ensure search functions work with 768-dim embeddings

**Files to Check**:

1. **`src/hooks/useEnhancedSearch.tsx`**:
   - Verify similarity threshold (0.78) still appropriate for Nomic
   - May need re-tuning based on Nomic's embedding space
   - Update any dimension-specific logic

2. **`src/hooks/useEnhancedSearchWithLinks.tsx`**:
   - Same threshold validation

3. **Database RPC calls**:
   - All calls to `match_notes()` automatically use new 768-dim signature
   - No code changes needed (PostgreSQL handles it)

**Testing Plan**:
- Generate embeddings for test notes
- Run search queries
- Validate similarity scores are reasonable (0.7-0.9 range for relevant results)
- Adjust threshold if needed

---

### Phase 6: Cleanup & Deprecation

**Goal**: Remove dead code and OpenAI references

**Files to Update**:

1. **`src/hooks/useBulkEmbeddingOperations.tsx`**:
   - Update to call Ollama-based `note-embed` function
   - Validate 768-dim output

2. **Remove unused dependencies** (optional):
   - Check if OpenAI SDK is still needed elsewhere
   - If not, remove from package.json/import maps

3. **Update comments/documentation**:
   - Search codebase for "text-embedding-3-small" references
   - Update to "nomic-embed-text" where applicable

---

## Implementation Order

**Recommended Sequence**:

1. ✅ **Database Migration** (Phase 1)
   - Creates clean schema foundation
   - No dependencies

2. ✅ **Shared Ollama Provider** (Phase 2A)
   - Reusable utility
   - Needed by Edge Functions

3. ✅ **Update Edge Functions** (Phase 2B, 2C)
   - Critical path for embedding generation
   - Both note-embed and query-embed

4. ✅ **Environment Configuration** (Phase 4)
   - Set up Ollama endpoint
   - Test Edge Functions can reach homelab

5. ✅ **Client-Side Simplification** (Phase 3)
   - Remove complexity
   - Single embedding path

6. ✅ **Search Logic Validation** (Phase 5)
   - Test embeddings work
   - Tune thresholds if needed

7. ✅ **Cleanup** (Phase 6)
   - Remove dead code
   - Update documentation

---

## Critical Files Summary

**Must Modify**:

1. `supabase/migrations/[new]_migrate_to_nomic_768.sql` - Schema migration
2. `supabase/functions/_shared/ollama-provider.ts` - New shared utility
3. `supabase/functions/note-embed/index.ts` - Replace OpenAI with Ollama
4. `supabase/functions/query-embed/index.ts` - Replace OpenAI with Ollama
5. `src/hooks/useEmbeddingProvider.tsx` - Simplify to Ollama-only
6. `.env.example` - Update configuration template

**Should Review**:

7. `src/services/localEmbedding.ts` - Consider deletion
8. `src/hooks/useEnhancedSearch.tsx` - Validate threshold
9. `src/hooks/useBulkEmbeddingOperations.tsx` - Verify compatibility
10. `search/session.context.md` - Document decision

---

## Validation Checklist

Before considering v1.0 ready:

- [ ] Ollama instance has `nomic-embed-text` model pulled (`docker exec ollama ollama list`)
- [ ] Edge Functions can reach `https://ollama.haugaard.dev/api/embeddings`
- [ ] Database schema updated to `vector(768)` with metadata columns
- [ ] Test note embedding generation returns 768-dim vector
- [ ] Test query embedding generation returns 768-dim vector
- [ ] Search query returns relevant results with reasonable similarity scores
- [ ] Bulk embedding operation works for multiple notes
- [ ] No references to OpenAI in embedding code paths
- [ ] Environment variables documented in `.env.example`

---

## Risks & Mitigations

**Risk 1: Ollama Availability**
- **Issue**: Homelab Ollama might be down, slow, or unreachable
- **Mitigation**: Add retry logic with exponential backoff in `ollama-provider.ts`
- **Mitigation**: Add timeout (e.g., 30 seconds) for embedding generation
- **Mitigation**: Consider local fallback for development (optional)

**Risk 2: Dimension Mismatch**
- **Issue**: Code expects 384-dim, Nomic returns 768-dim
- **Mitigation**: Validation in `ollama-provider.ts` (already planned)
- **Mitigation**: Update ALL hardcoded dimension references

**Risk 3: Similarity Threshold Mismatch**
- **Issue**: 0.78 threshold tuned for OpenAI, might not work for Nomic
- **Mitigation**: Test with sample queries, adjust threshold
- **Mitigation**: Document threshold as configurable for future tuning

**Risk 4: Performance**
- **Issue**: Ollama on CPU (8-core, 32GB RAM) might be slower than OpenAI
- **Mitigation**: Acceptable for single-user system (per homelab specs)
- **Mitigation**: Batch operations already rate-limited (1s between batches)

---

## Post-v1.0 Enhancements

**Future Considerations** (not for initial v1.0):

1. **Redis Caching**:
   - Cache Ollama embeddings to avoid re-computation
   - Implement as Phase 1 of redis-flyio-report.xml plan

2. **Multi-Model Support**:
   - Add model metadata architecture (already in schema)
   - Support A/B testing of different embedding models
   - Implement incremental migration strategy

3. **Local Client-Side Embedding**:
   - Find Transformers.js-compatible Nomic model
   - Implement browser-based 768-dim embedding generation
   - Reduce server load for high-frequency queries

4. **Monitoring & Analytics**:
   - Track embedding generation latency
   - Monitor Ollama homelab performance
   - Alert if embedding quality degrades

---

## Success Criteria

**v1.0 is ready when**:

- ✅ All embeddings use `nomic-embed-text` via Ollama homelab
- ✅ No OpenAI dependencies in embedding code paths
- ✅ Database schema is 768-dim with model metadata
- ✅ Search functionality works with reasonable quality
- ✅ Configuration uses environment variables
- ✅ Documentation reflects nomic-embed-text choice
