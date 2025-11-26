# Search Deep Dive - Session Context

**Date**: November 26, 2025
**Objective**: Understand the full search functionality, make informed decisions about features and architecture

**Session Progress**:
- ✅ Deep dive into Fuse.js fuzzy search implementation
- ✅ Clarified "Hugging Face" terminology (model hub vs. managed service vs. local deployment)
- ✅ Validated note creation/processing workflow against original plan
- ✅ Analyzed queue vs. unreviewed status implications
- ✅ Identified key differences between plan and implementation

**Project Context**:
- **Single-user system** with learning focus
- **No cost/scale constraints** - prioritize sophistication, elegance, capability
- **Local infrastructure available**: 8-core CPU, 32GB RAM, local Ollama instance
- **Goal**: Build "best and coolest" search capabilities leveraging available tools and homelab resources

---

## WHAT EXISTS TODAY

### Hybrid Search System (Core Feature)
- **Fuzzy Search** (Fuse.js): Client-side, immediate results with weighted scoring
  - Weights: Title (40%), Content (30%), Tags (30%)
  - Threshold: 0.3 (balanced precision/recall)

- **Semantic Search** (AI-Powered): Vector similarity using embeddings
  - Local: Hugging Face (`mixedbread-ai/mxbai-embed-xsmall-v1`)
  - Cloud: OpenAI `text-embedding-3-small` (384 dimensions)
  - Storage: PostgreSQL with pgvector extension
  - Similarity: Cosine similarity, threshold 0.78

- **Hybrid Scoring**: 60% semantic + 40% fuzzy for optimal results

### Search UI Components
- SearchInterface.tsx - Main search page
- EnhancedSearch.tsx - Advanced search input
- SearchResults.tsx - Result display
- SearchResultsGroup.tsx - Grouped results with tiering
- SearchMetrics.tsx - Performance indicators
- SearchSuggestions.tsx - Intelligent suggestions
- SearchAnalyticsDashboard.tsx - Analytics and metrics

### Intelligent Query Processing
- Intent detection (search, create, navigate, find_similar)
- Temporal extraction (temporal queries like "last week", "this month")
- Entity recognition (persons, projects, tags)
- Tag/exclude tag parsing (#tag, -#tag)
- Category hint extraction
- Query expansion with synonyms

### Search Modes
- Standard Search (text-based, fuzzy + semantic)
- Tag Search (direct tag matching)
- Combined Mode (hybrid, default)
- Link-Enhanced Search (connection-aware, UI partial)
- Similarity Search (Jaccard similarity)
- Connections Search (most connected notes)

### Backend Infrastructure
- `note_embeddings` table with pgvector support
- `match_notes()` RPC function for semantic similarity
- Edge Functions for embedding generation
- WebGPU acceleration when available
- 5-minute client-side caching (React Query)
- Performance monitoring and warmup

### Search Analytics
- Total searches, average duration, success rate
- Top queries tracking
- Search type distribution (fuzzy/semantic/hybrid)
- Recent activity monitoring
- Time range filtering (24h/7d/30d)

---

## WHAT'S PLANNED/ANTICIPATED

### Redis Caching Layer (3-Phase Implementation)
**Phase 1: Quick Wins** (Highest Priority)
- Embedding cache for OpenAI API (70-90% cost reduction)
- Search result cache (5-60 minute TTL)
- Rate limiting for embedding generation
- Expected: 5-10x faster repeat searches

**Phase 2: Performance Optimization**
- Backlink graph caching
- Tag autocomplete caching
- Entity extraction cache
- Link suggestion cache
- Sub-50ms link graph queries

**Phase 3: Advanced Features**
- RedisSearch for vector similarity
- RedisGraph for complex link traversal
- Real-time analytics aggregation
- 10-100x faster semantic search for hot queries

**Provider**: Upstash Redis (serverless, REST API for Edge Functions)
**Expected Cost**: $0-20/month

### Link-Enhanced Search (Partially Implemented)
- Backend logic complete
- UI placeholder ("coming soon...")
- Features: Search by connection strength, filter by link direction, shared connection analysis

### Planned Improvements
- Faceted search (multi-dimensional filtering)
- Enhanced analytics (click-through rates, abandonment)
- Query expansion and reformulation
- Content summarization in results

---

## KEY FILES BY CATEGORY

### Frontend Components
- `src/components/SearchInterface.tsx` - Main search page
- `src/components/EnhancedSearch.tsx` - Advanced search input
- `src/components/SearchResults.tsx` - Result display with metrics
- `src/components/SearchResultsGroup.tsx` - Grouped/tiered results
- `src/components/SearchMetrics.tsx` - Performance indicators
- `src/components/SearchSuggestions.tsx` - Intelligent suggestions
- `src/components/SearchAnalyticsDashboard.tsx` - Analytics dashboard

### Hooks
- `src/hooks/useEnhancedSearch.tsx` - Main search logic
- `src/hooks/useEnhancedSearchWithLinks.tsx` - Link-aware search
- `src/hooks/useEmbeddingProvider.tsx` - Local/cloud embedding management

### Backend
- `supabase/functions/query-embed/index.ts` - Search query embeddings
- `supabase/functions/note-embed/index.ts` - Note content embeddings
- `supabase/migrations/` - Database schema and indexes

### Utilities
- `src/utils/queryProcessor.ts` - Query intelligence
- `src/utils/performanceMonitor.ts` - Search performance tracking

---

## QUESTIONS TO EXPLORE

As we dive deeper, we should understand:

1. **Search Behavior & UX**
   - What are the most common search patterns users employ?
   - How do people interact with results (click patterns)?
   - What's the ratio of fuzzy vs. semantic searches?
   - Should we optimize for discovery or precision?

2. **Performance & Cost**
   - Current embedding generation costs?
   - Query latency targets?
   - Caching strategy ROI?
   - Storage growth implications?

3. **Link-Enhanced Search**
   - Why is this a priority?
   - What are the key use cases?
   - How should connection strength be weighted?

4. **Search Quality**
   - Are results meeting user expectations?
   - Which search mode(s) perform best?
   - What are the failure modes?
   - How do we measure search success?

5. **Analytics & Insights**
   - What metrics matter most?
   - How to identify poor-performing searches?
   - What should trigger improvements?

6. **Scaling & Growth**
   - How does performance degrade with more notes?
   - Embedding table growth?
   - Query latency at scale?

7. **Feature Prioritization**
   - Redis caching urgency?
   - Link-enhanced search priority?
   - Faceted search value?
   - Advanced analytics needs?

---

## CRITICAL CLARIFICATIONS NEEDED

Before analyzing tools and making recommendations, we need to understand:

### 1. On "Best and Coolest" Search Capabilities
**Sophistication Level** - Priority areas for innovation:
- [ ] State-of-the-art retrieval (latest embedding models, multimodal search)?
- [ ] Advanced reasoning over results (nuanced query understanding)?
- [ ] Novel interaction patterns (conversational search, search-as-you-think)?
- [ ] Beautiful/magical UX for search experience?

**Learning Goals** - What aspects matter most:
- [ ] Vector databases and semantic search fundamentals?
- [ ] Comparing embedding architectures and trade-offs?
- [ ] Complex data flows and query optimization?
- [ ] Frontier LLM capabilities?
- [ ] System architecture and data pipelines?

### 2. Knowledge Base Characteristics
- What kind of content? (notes, research, ideas, code, writing, hybrid?)
- Typical note length? (short bullets vs. long form?)
- How interconnected? (heavily linked graph vs. loosely connected?)
- Domain-specific terminology or concepts?

### 3. "Coolness" Priorities
- [ ] Finding obscure connections between distant ideas?
- [ ] Understanding intent from vague, natural queries?
- [ ] Real-time suggestions that surprise and delight?
- [ ] Hybrid search elegance (combining multiple strategies)?
- [ ] Something else entirely?

### 4. Homelab Integration Strategy
- Should search leverage local Ollama LLMs for re-ranking/query enhancement?
- Keep embeddings local vs. cloud trade-offs?
- Local inference for ranking vs. cloud embeddings?
- What do you want to learn about local vs. cloud inference?

---

## NEXT STEPS

This document will be updated as we explore:
- Deep dive into search algorithm details
- Analysis of search component interactions
- Performance characteristics and bottlenecks
- Tool evaluation (Hugging Face vs OpenAI vs alternatives)
- Feature prioritization and implementation roadmap

**Awaiting answers to clarifying questions above before proceeding with tool analysis.**

---

## NOVEMBER 26 SESSION - KEY LEARNINGS

### 1. Fuse.js Deep Dive ✅
**Fuzzy Search Implementation Confirmed:**
- Uses Fuse.js v7.1.0 across 4 integration points (useEnhancedSearch, useEnhancedSearchWithLinks, useBracketLinking, TagLibrary)
- Standardized threshold: 0.3 (70% match required), except bracket linking (0.4 for stricter UX)
- Field weights consistent: Title (40%) > Content & Tags (30% each), with link variants
- Inverted scoring: Fuse distance → relevance (lower Fuse score = higher relevance)
- Query preprocessing via `queryProcessor.ts`: Intent detection, temporal extraction, entity recognition
- Hybrid merging: 60% semantic + 40% fuzzy weighting for final scores
- Result tiering: exact/high/medium/related based on score ranges (>0.9, >0.7, >0.5, etc.)

**Key Files:**
- `src/hooks/useEnhancedSearch.tsx` - Main fuzzy + semantic engine (lines 108-400)
- `src/hooks/useEnhancedSearchWithLinks.tsx` - Link-aware variant
- `src/hooks/useBracketLinking.tsx` - Real-time suggestions (debounced 300ms)
- `src/utils/queryProcessor.ts` - Query intelligence pipeline (45-246)

### 2. Hugging Face Terminology Clarified ✅
**Key Distinction:**
- "Hugging Face" typically refers to **the Hub** (huggingface.co) - a model repository
- NOT a specific inference service unless using their paid Inference API
- Your `nomic-embed-text` on local Ollama: **published by Nomic AI**, distributed via HF Hub, runs on **your hardware** (free, fast, private)
- OpenAI embeddings: Different provider, different embedding space (1536-dim vs. your potential 384-dim local)

**Recommendation:**
- Distinguish between "HF Hub models" (location) vs. "local inference" (where it runs)
- Document choice clearly: OpenAI (cloud) vs. `nomic-embed-text` (local Ollama)
- Redis caching benefits most for OpenAI (70-90% cost reduction); minimal cost benefit for local but still useful for speed

### 3. Note Processing Workflow Validated ✅
**Plan Confirmed - With Implementation Differences:**

**What's Accurate:**
- ✅ Minimal capture processing (title auto-gen from first 5 words, slug)
- ✅ Unreviewed queue exists (status = 'not_reviewed')
- ✅ User review phase with delete/revise/pass options
- ✅ Search/enrichment phase follows (embeddings, tags, backlinks)
- ✅ Note becomes part of corpus when reviewed (status = 'reviewed')

**What Differs (Critical):**
- ❌ NO automatic AI processing - Everything is opt-in and user-initiated
- ❌ NO required enrichment - Note can be fully reviewed without embeddings/tags/backlinks
- ❌ NO pipeline progression - Notes don't auto-advance through stages; user controls what applies
- ❌ Feature flag disabled - AI summarization is explicitly turned off (QuickCapture.tsx:167)
- ❌ Processing flags are metadata only - Don't affect note visibility or search capability

**Current Reality:**
Notes flow: **Capture** → **Unreviewed Queue** → **User Opens & Optionally Applies Processing** → **Mark Reviewed**

Processing options during review (user-controlled checkboxes):
- Generate Embeddings (client-side local or OpenAI)
- Generate Tags (AI suggestions with confidence scores)
- Review Backlinks (AI extraction with entity matching)

### 4. Queue vs. Unreviewed Status - Decision Pending ⏳
**Trade-offs Analyzed:**

**Current: Unreviewed Status (Simple)**
- Pros: One table, flexible, searchable, no sync overhead
- Cons: Passive discovery, no visibility metrics, no batch operations, accumulation risk

**Alternative: Explicit Queue (Complex)**
- Pros: Intentional inbox, prioritizable, batchable, trackable metrics, psychological power
- Cons: Extra table, sync complexity, potential over-engineering if unused

**Recommendation for Consideration:**
- Keep unreviewed status for now (lower complexity)
- Can layer on queue enhancements later (priority field, batch ops, metrics)
- Cost of adding queue semantics later is low; cost of over-engineering now is real

**User Input Needed:**
- How do you want to interact with capture? (batch/process vs. let flow naturally)
- Does unreviewed note accumulation feel productive or anxiety-inducing?
- Would batch operations or "queue depth" metrics help your workflow?

---

## NEXT SESSION PRIORITIES

1. **Live App Inspection** - Look for pain points, UX friction, missing features
2. **Embedding Strategy Decision** - Commit to local (nomic-embed-text) vs. OpenAI vs. hybrid
3. **Redis Caching Scoping** - Phase 1 quick wins most valuable; Phase 2/3 depend on usage
4. **Queue Decision** - Make final call on queue vs. unreviewed status path
5. **Link-Enhanced Search** - Assess priority and use cases for UI implementation

