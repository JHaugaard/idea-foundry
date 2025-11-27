# Claude Code Session Context

## Project: Idea Foundry
**Stack**: React + TypeScript + Supabase (self-hosted) + Ollama + Docker + Hostinger VPS
**Last Updated**: 2025-11-26

---

## Current Sprint

### Active Work
- [ ] Phase 1: Database Schema Migration (vector(768) + metadata columns)
- [ ] Phase 2: Edge Functions (replace OpenAI with Ollama)
- [ ] Phase 3: Client-side simplification (Ollama-only)
- [ ] Phase 4: Environment configuration
- [ ] Phase 5: Search logic validation and threshold tuning
- [ ] Phase 6: Cleanup and documentation

### Recently Completed
- ✅ **Localhost Dev Mode Authentication** (2025-11-26)
  - Enabled `BYPASS_AUTH` in AuthContext for local development without Supabase
  - Consolidated auth bypass to single toggle location
  - Mock dev user provided: `id: 00000000-0000-0000-0000-000000000001`
  - Ready for Supabase integration on Homelab (just flip `BYPASS_AUTH = false`)
- ✅ **Embedding Model Decision** - Locked to `nomic-embed-text` via Ollama (2025-11-26)
  - Analyzed model lock-in risks and mitigation strategies
  - Created comprehensive migration plan with 6 phases
  - Documented database schema changes, Edge Function updates, environment config
- ✅ **Migration Plan Created** - `search/nomic-migration-plan.md` (2025-11-26)
  - Moved from Claude Code system location to project directory
  - Covers all technical details, risks, validation checklist
- ✅ Completed comprehensive infrastructure planning (2025-10-25)
- ✅ Created development-environment-setup-guide.md (2025-10-25)
- ✅ Decided on Infrastructure-First approach (2025-10-25)

---

## Today's Session - 2025-11-26

### Objective
Lock down embedding model choice, create migration plan for v1.0, and enable localhost development mode

### Major Decisions Made

**1. Localhost Development Authentication Strategy**
- **Decision**: Enable dev bypass mode for localhost development
- **Implementation**: Single `BYPASS_AUTH` flag in `AuthContext.tsx`
- **Mock User**: `{ id: '00000000-0000-0000-0000-000000000001', email: 'dev@example.com' }`
- **Transition to Supabase**: Set `BYPASS_AUTH = false` when Homelab Supabase is ready
- **Files Changed**:
  - `src/contexts/AuthContext.tsx` - Enabled BYPASS_AUTH, updated comments
  - `src/App.tsx` - Removed redundant DEV_BYPASS_AUTH, simplified ProtectedRoute

**2. Embedding Model Decision: `nomic-embed-text` via Ollama**
- **Model**: nomic-embed-text (768 dimensions)
- **Provider**: Ollama on homelab (https://ollama.haugaard.dev)
- **Rationale**: Free, private, excellent quality, leverages existing infrastructure
- **Lock-in Analysis**: Vectors are incompatible across models; re-embedding entire corpus required if switching
- **Mitigation**: Added model metadata columns to schema for future flexibility

**2. Fresh Start Approved**
- No production embeddings to migrate
- Delete existing data, start clean with 768-dim schema
- Simplifies deployment process

**3. Architecture Decision**
- Single embedding model (no multi-model abstraction for v1.0)
- All embeddings go through Ollama via Edge Functions
- Removed client-side local embedding complexity
- Environment variable configuration for flexibility

### Documentation Created

**Migration Plan**: `search/nomic-migration-plan.md` (2025-11-26)
- 6 implementation phases with detailed technical steps
- Database schema changes (vector(1536) → vector(768))
- Edge Function updates (OpenAI → Ollama)
- Environment configuration requirements
- Validation checklist and risk mitigations
- Post-v1.0 enhancement roadmap

### Key Technical Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Localhost Auth | BYPASS_AUTH in AuthContext | Single toggle, mock user for dev, ready for Supabase |
| Embedding Model | nomic-embed-text (768-dim) | Free, local, excellent quality |
| Vector DB | Supabase PostgreSQL (pgvector) | Already running on homelab VPS |
| Migration Cost | Low (small corpus expected) | Re-embedding 10K notes = hours, not days |
| Schema Flexibility | Added model metadata columns | Enables future model switching without redesign |
| Client Approach | Ollama-only | Simpler architecture, consistent model usage |

---

## Previous Session - 2025-10-25

### Objective
Strategic planning for transitioning from Lovable to Claude Code + self-hosted infrastructure deployment

### Major Decisions Made

**1. Infrastructure-First Approach**
- Build VPS infrastructure BEFORE heavy app development
- Deploy Supabase, Ollama, n8n to production VPS first
- Develop locally with frontend pointing to VPS backend
- Deploy frontend via CI/CD when ready

**2. VPS Architecture**
- **Start**: Single VPS (16GB RAM, 8 CPU cores) - ~$40-60/month
- **Monitor**: Resource usage (RAM, CPU, database performance)
- **Split when needed**: Move Ollama to dedicated VPS 2 if contention occurs
- **Hosting**: Hostinger (confirmed provider)

**3. Technology Decisions**
- ✅ **Keep Supabase** (self-hosted vs PocketBase)
  - Rationale: More robust, PostgreSQL + pgvector for vector search, proven at scale
- ✅ **Use Ollama** for local LLM (vs OpenAI API dependency)
  - Models: nomic-embed-text (embeddings), llama3.1:8b (text generation)
  - Cost: $0/month vs OpenAI pay-per-use
- ✅ **Thunderbolt 5 External SSD** for local development
  - All code + Docker volumes on portable drive
  - Physical drive moves between MacBook and Desktop
  - Will graduate to cloud-native workflow post-deployment

**4. Repository Structure - CRITICAL DECISION**
- **Split project into TWO repositories:**
  1. **infrastructure** (NEW) - Reusable, project-agnostic DevOps toolkit
     - VPS setup, Docker Compose files, Nginx configs, backup scripts, monitoring
     - Can be public to help others learn
     - Serves multiple future projects
  2. **idea-foundry** (EXISTING) - Application code only
     - Frontend components, business logic, app-specific configs
     - Stays focused on the app itself
- **Rationale**: Separation of concerns, reusability, cleaner git history

### Documentation Created
- **Modified**: `docs/development-environment-setup-guide.md`
  - Complete rewrite for Infrastructure-First approach (2,776 lines)
  - Phase-by-phase guide: VPS setup → Local dev → CI/CD → Production
  - Week-by-week timeline (8+ weeks to production-ready infrastructure)
  - Thunderbolt 5 external SSD setup and optimization
  - VPS monitoring and split decision framework
  - Graduation concept: external drive → cloud-native CI/CD

- **Added**: `docs/INFRASTRUCTURE_REPO_README.md`
  - Comprehensive README for new infrastructure repository
  - Architecture diagrams, cost breakdowns, performance benchmarks
  - Security checklist, roadmap, FAQ, troubleshooting
  - Public-repo friendly (helps others learn self-hosting)

### Learning Path Established

**Weeks 1-2**: VPS provisioning, Docker, Nginx, SSL
**Weeks 3-4**: Supabase deployment and testing
**Week 5**: Ollama setup with LLM models
**Week 6**: n8n deployment (optional, can defer)
**Week 7**: Security hardening, monitoring, backups
**Week 8+**: Local development workflow (Thunderbolt 5 SSD)
**Later**: CI/CD pipeline and frontend deployment

### Key Technical Insights

**Current Codebase Analysis:**
- 160+ React components
- 39 database migrations
- Sophisticated tag system (analytics, relationships, AI-powered)
- Hybrid search (fuzzy + semantic with pgvector)
- Backlink system with bracket syntax `[[Note Title]]`
- Edge functions: note-embed, query-embed, suggest-tags, extract-backlinks

**Performance Expectations:**
- VPS PostgreSQL: <10ms simple queries, 50-100ms complex
- Ollama (CPU): 1-3s per embedding, 3-10s tag suggestions
- Network latency: 20-100ms (same continent)
- Thunderbolt 5 SSD: ~5-10% slower than internal (acceptable)

---

## Technical Context

### Current Architecture (Lovable)
- **Frontend**: React 18.3.1, TypeScript, Vite
- **Database**: Supabase Cloud (PostgreSQL + pgvector)
- **AI**: OpenAI API (text-embedding-3-small, GPT-4o-mini)
- **Search**: Fuse.js (fuzzy) + pgvector (semantic)
- **Deployment**: Lovable platform

### Target Architecture (Self-Hosted)
- **VPS**: Hostinger, Ubuntu 22.04 LTS, 16GB RAM, 8 CPU
- **Backend Services** (containerized on VPS):
  - Supabase (PostgreSQL, Auth, Storage, Realtime, API)
  - Ollama (nomic-embed-text, llama3.1:8b)
  - n8n (workflow automation)
  - Nginx (reverse proxy, SSL via Let's Encrypt)
- **Local Dev**: Thunderbolt 5 external SSD, frontend points to VPS
- **CI/CD**: GitHub Actions → auto-deploy to VPS
- **Monitoring**: htop, docker stats, Uptime Kuma (optional)
- **Backups**: Daily PostgreSQL dumps, automated via cron

### Database Schema (Key Tables)
```sql
notes (id, user_id, title, content, tags[], slug, semantic_enabled)
note_embeddings (note_id, embedding vector(1536))
note_links (source_note_id, target_note_id, canonical_title, canonical_slug)
tag_analytics (tag_name, usage_count, last_used)
tag_relationships (tag1, tag2, co_occurrence_count, strength)
```

### Local Development Setup
- **Location**: `/Volumes/IdeaFoundryDev/projects/idea-foundry`
- **External Drive**: Thunderbolt 5 NVMe SSD (APFS formatted)
- **Optimizations**: Spotlight disabled, Time Machine excluded
- **Workflow**: Code locally, backend APIs point to VPS
- **Multi-machine**: Physical drive OR git sync between MacBook/Desktop

### Environment
- **Local Dev**: macOS (Thunderbolt 5 external SSD)
- **VPS Backend**: Hostinger Ubuntu 22.04 (to be provisioned)
- **Production**: Same VPS (frontend deployed via CI/CD)

---

## Next Session TODO

### Immediate (Before VPS Work)
- [ ] Fix any iCloud + git issues (move repos out of iCloud)
- [ ] Set up Thunderbolt 5 external SSD (format APFS, optimize)
- [ ] Create infrastructure repository on GitHub
- [ ] Move infrastructure docs to new repo
- [ ] Commit and push changes to idea-foundry repo (remove moved files)

### When Supabase on Homelab is Ready
- [ ] Set `BYPASS_AUTH = false` in `src/contexts/AuthContext.tsx`
- [ ] Update Supabase credentials in `src/integrations/supabase/client.ts`
- [ ] Test authentication flow (signup, login, logout)
- [ ] Verify user-scoped data queries work correctly

### VPS Infrastructure Setup (Weeks 1-2)
- [ ] Provision Hostinger VPS (16GB RAM, 8 CPU, Ubuntu 22.04)
- [ ] Initial VPS security hardening (SSH keys, firewall, fail2ban)
- [ ] Install Docker + Docker Compose
- [ ] Configure domain DNS A records (supabase.*, ollama.*, n8n.*, app.*)
- [ ] Install Nginx and Certbot (SSL preparation)

### Supabase Deployment (Weeks 3-4)
- [ ] Clone Supabase Docker repository on VPS
- [ ] Configure environment variables (.env with secure passwords)
- [ ] Generate JWT secrets and API keys
- [ ] Deploy Supabase stack (docker compose up)
- [ ] Configure Nginx reverse proxy for Supabase
- [ ] Obtain SSL certificate for supabase.yourdomain.com
- [ ] Test Supabase API from laptop
- [ ] Access Supabase Studio and verify

### Ollama Setup (Week 5)
- [ ] Deploy Ollama container on VPS
- [ ] Download models (nomic-embed-text, llama3.1:8b)
- [ ] Configure Nginx for Ollama
- [ ] Test embedding generation from laptop
- [ ] Benchmark performance (CPU inference times)

### Commands to Resume Work
```bash
# If starting fresh with external drive setup
diskutil list  # Find Thunderbolt drive
diskutil eraseDisk APFS IdeaFoundryDev disk2  # Format
sudo mdutil -i off /Volumes/IdeaFoundryDev  # Disable Spotlight
sudo tmutil addexclusion /Volumes/IdeaFoundryDev  # Exclude Time Machine

# Clone project to external drive
cd /Volumes/IdeaFoundryDev/projects
git clone https://github.com/JHaugaard/idea-foundry.git
cd idea-foundry

# Start local dev (when VPS backend is ready)
npm install
npm run dev

# Monitor VPS (when deployed)
ssh deploy@your-vps-ip
./monitor.sh
```

---

## Important Reminders

### Git Workflow with Repository Split
- **infrastructure repo**: VPS configs, Docker files, scripts, docs → PUSH changes
- **idea-foundry repo**: App code only → REMOVE moved files, COMMIT, PUSH
- GitHub is source of truth - always commit after structural changes

### Philosophy
- **Infrastructure-First**: Build backend before heavy app development
- **Learn by doing**: Master DevOps while building, not in production panic
- **Reconfigurable**: Nothing permanent, can split VPS later if needed
- **Process over deadlines**: This is a learning journey, not a race

### VPS Monitoring Triggers (When to Split to 2-VPS)
- RAM usage consistently >80% (12.8GB+)
- Database queries slow during Ollama inference (>100ms increase)
- CPU load average >10 sustained
- Want to experiment with larger LLM models without risking production

---

## Quick Links
- **GitHub Repo (App)**: https://github.com/JHaugaard/idea-foundry
- **GitHub Repo (Infrastructure)**: _To be created_
- **Lovable Project**: https://lovable.dev/projects/[project-id]
- **Core Functionality Report**: `docs/core_functionality.md`
- **Infrastructure Setup Guide**: `docs/development-environment-setup-guide.md`
- **Infrastructure README (template)**: `docs/INFRASTRUCTURE_REPO_README.md`

---

## Session Notes

**Key Insight**: Splitting infrastructure from application code is smart architecture that:
- Matches professional DevOps practices
- Enables infrastructure reuse across multiple projects
- Keeps git history relevant to each domain
- Makes learning portable and shareable

**Next Major Milestone**: VPS infrastructure deployed and accessible via HTTPS (Weeks 1-4)
