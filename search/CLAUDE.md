# Search Sub-Project - Claude Context

## Project Overview
Deep dive investigation and optimization of the Idea Foundry search functionality. This sub-project explores the best-in-class search capabilities for a personal knowledge management system with emphasis on learning, sophistication, and cutting-edge features rather than scale or cost optimization.

## Goals
1. **Understand** the current hybrid search architecture (fuzzy + semantic)
2. **Evaluate** embedding models, LLM providers, and caching strategies
3. **Design** optimal configurations for single-user, knowledge-intensive use case
4. **Implement** improvements that leverage current homelab infrastructure
5. **Document** decisions and rationale for future reference

## Key Context
- **User Base**: Single user (learning-focused)
- **Infrastructure**: Private homelab available (8-core CPU, 32GB RAM, local Ollama)
- **Constraints**: None on cost, scalability, or complexity - prioritize capability and elegance
- **Knowledge Domain**: Personal notes, research, ideas, interconnected notes
- **Current Stack**: Hybrid search (Fuse.js fuzzy + semantic with pgvector), OpenAI embeddings, Supabase

## Sub-Project Structure
```
search/
├── CLAUDE.md                    # This file - Claude context
├── session.context.md           # Session notes and findings
├── redis-flyio-report.xml       # Redis analysis (existing)
├── embeddings-analysis.md       # [TO CREATE] Embedding models comparison
├── tools-evaluation.md          # [TO CREATE] HF vs OpenAI vs other tools
├── architecture.md              # [TO CREATE] Proposed search architecture
└── implementation-roadmap.md    # [TO CREATE] Step-by-step implementation plan
```

## Active Investigations
- [ ] Embedding model comparison (Hugging Face vs OpenAI vs alternatives)
- [ ] Vector database strategies (PostgreSQL/pgvector vs alternatives)
- [ ] Caching layer options (Redis vs in-memory vs other)
- [ ] Query enhancement and reranking strategies
- [ ] Local vs cloud inference trade-offs
- [ ] Link-enhanced search optimization

## Notes for Claude
When working on this sub-project:
1. Reference `session.context.md` for ongoing findings and context
2. Check existing reports (`redis-flyio-report.xml`) for prior analysis
3. Create decision documents as analyses are completed
4. Update session.context.md with discoveries and open questions
5. Focus on learning value and architectural elegance, not scale
