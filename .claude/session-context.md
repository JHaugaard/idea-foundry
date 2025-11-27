# Claude Code Session Context

## Project: Idea Foundry
**Stack**: React + TypeScript + Supabase (self-hosted) + Ollama + Docker + Hostinger VPS
**Last Updated**: 2025-11-27

---

## Current Sprint

### Active Work
- [ ] Debug auth schema issue for creating new users (jhaugaard@mac.com)
- [ ] Deployment to vps2 (Phase 4 - using skills)

### Recently Completed
- ✅ **Auth Working with Homelab Supabase** (2025-11-27)
  - Admin user created: `admin@ideafoundry.net` / `TempPassword2025`
  - User ID: `745804e3-b633-4dc5-b6dc-538941b6ef9c`
  - Test note created and visible in app
  - RLS policies working correctly

- ✅ **CORS/Auth Issue RESOLVED** (2025-11-27)
  - Root cause: Old Lovable environment variables in shell overriding `.env`
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` were set system-wide
  - Fix: `unset VITE_SUPABASE_URL VITE_SUPABASE_PROJECT_ID VITE_SUPABASE_PUBLISHABLE_KEY`
  - Permanent fix: Remove from `~/.zshrc` or shell profile

- ✅ **Removed lovable-tagger Plugin** (2025-11-27)
  - Removed from `vite.config.ts` as no longer needed
  - Was for Lovable platform component tagging

- ✅ **Phase 1: Database Connected to Homelab Supabase** (2025-11-27)
  - Updated `.env` to point to `https://supabase.haugaard.dev`
  - Modified `client.ts` to read from environment variables
  - Applied all 40+ migrations to homelab Supabase on vps8
  - Enabled pgvector extension
  - Created `note_embeddings` table with 768-dimension vectors

- ✅ **Phase 2: Edge Functions Migrated to Ollama** (2025-11-27)
  - `note-embed` → Ollama `nomic-embed-text` (768 dims)
  - `query-embed` → Ollama `nomic-embed-text` (768 dims)
  - `suggest-tags` → Ollama `llama3.2:3b`
  - `note-summarize` → Ollama `llama3.2:3b`
  - Removed all OpenAI API dependencies

- ✅ **Phase 3: Auth Configuration** (2025-11-27)
  - Set `BYPASS_AUTH = false` in AuthContext
  - Removed dev-only RLS policies from database
  - Created migration `20251127090000_remove_dev_policies.sql`

---

## Today's Session - 2025-11-27

### Objective
Connect app to homelab Supabase, migrate Edge Functions to Ollama, configure production auth

### Technical Work Completed

**CORS/Auth Debugging**
- Browser showed "Failed to fetch" on auth login
- curl tests passed with correct CORS headers
- Discovered old Lovable env vars overriding `.env` file
- `VITE_SUPABASE_URL=https://lvnjmmazkftcjqxstoyn.supabase.co` was in shell environment
- Fix: `unset` the old variables before running `npm run dev`

**Database Setup (vps8 - homelab Supabase)**
- Installed psql locally via `brew install libpq`
- Applied all migrations via `docker exec -it supabase-db psql`
- Enabled pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector`
- Created repair migration for 768-dim vectors and missing columns
- Verified 15 tables created successfully

**User Account Created**
- Email: `admin@ideafoundry.net`
- Password: `TempPassword2025` (user will change)
- User ID: `745804e3-b633-4dc5-b6dc-538941b6ef9c`
- Test note created and visible

**Known Issue - New User Creation**
- Creating new users (e.g., `jhaugaard@mac.com`) fails with "Database error querying schema"
- The `jhaugaard@mac.com` email already exists in auth.users (from Lovable migration?)
- GoTrue auth service has intermittent database errors
- Workaround: Use `admin@ideafoundry.net` for now
- TODO: Investigate auth schema on vps8

**Files Modified**
- `.env` - Points to `https://supabase.haugaard.dev`
- `src/integrations/supabase/client.ts` - Reads from env vars
- `src/contexts/AuthContext.tsx` - `BYPASS_AUTH = false`
- `vite.config.ts` - Removed lovable-tagger plugin
- `supabase/functions/note-embed/index.ts` - Ollama embeddings
- `supabase/functions/query-embed/index.ts` - Ollama embeddings
- `supabase/functions/suggest-tags/index.ts` - Ollama chat
- `supabase/functions/note-summarize/index.ts` - Ollama chat

**Migrations Created**
- `20251127082932_ollama_vector_768.sql` - Vector dimension change
- `20251127090000_remove_dev_policies.sql` - Remove dev RLS policies

### Deployment Target
- **App hosting**: vps2 (jhh-net network)
- **Database**: vps8 homelab Supabase
- **Domain**: ideafoundry.net (Cloudflare DNS)

---

## Next Session TODO

### Immediate
- [ ] Change password for `admin@ideafoundry.net` (currently `TempPassword2025`)
- [ ] Investigate auth schema issue on vps8 for creating new users
- [ ] Permanently remove old Lovable env vars from `~/.zshrc`

### Deployment (Phase 4)
- [ ] Deploy to vps2 using skills (ci-cd-implement, deploy-guide)
- [ ] Configure DNS for ideafoundry.net
- [ ] Test production deployment

### Commands to Resume Work
```bash
# IMPORTANT: Unset old Lovable env vars before running dev server
unset VITE_SUPABASE_URL VITE_SUPABASE_PROJECT_ID VITE_SUPABASE_PUBLISHABLE_KEY

# Start local dev
cd /Volumes/dev/develop/idea-foundry
npm run dev

# Login credentials
# Email: admin@ideafoundry.net
# Password: TempPassword2025
```

---

## Technical Context

### Current Architecture (Working)
- **Frontend**: React 18.3.1, TypeScript, Vite (localhost:8080)
- **Database**: Self-hosted Supabase on vps8 (https://supabase.haugaard.dev)
- **AI**: Ollama on vps8 (https://ollama.haugaard.dev)
  - Embeddings: nomic-embed-text (768 dims)
  - Chat: llama3.2:3b
- **Auth**: Supabase Auth (GoTrue) - working for existing users

### Database Schema (Key Tables)
```sql
notes (id, user_id, title, content, tags[], slug, semantic_enabled, category_type, review_status)
note_embeddings (note_id, embedding vector(768))
note_links (source_note_id, target_note_id, canonical_title, canonical_slug)
tag_analytics (tag_name, usage_count, last_used)
tag_relationships (tag1, tag2, co_occurrence_count, strength)
```

### Environment Variables (.env)
```
VITE_SUPABASE_URL=https://supabase.haugaard.dev
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_OLLAMA_URL=https://ollama.haugaard.dev
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (server-side only)
```

---

## Important Reminders

### Shell Environment Issue
Old Lovable environment variables may override `.env` file:
```bash
# Check if old vars exist
env | grep VITE_SUPABASE

# Remove them for current session
unset VITE_SUPABASE_URL VITE_SUPABASE_PROJECT_ID VITE_SUPABASE_PUBLISHABLE_KEY

# Permanently remove from ~/.zshrc or ~/.bashrc
```

### Current User Account
- **Email**: admin@ideafoundry.net
- **Password**: TempPassword2025 (change this!)
- **User ID**: 745804e3-b633-4dc5-b6dc-538941b6ef9c

---

## Quick Links
- **GitHub Repo (App)**: https://github.com/JHaugaard/idea-foundry
- **Homelab Supabase**: https://supabase.haugaard.dev
- **Homelab Ollama**: https://ollama.haugaard.dev
- **Target Domain**: ideafoundry.net

---

## Session Notes

**Key Win**: App now fully connected to self-hosted infrastructure on homelab!
- Database: vps8 Supabase with pgvector
- AI: vps8 Ollama (nomic-embed-text, llama3.2:3b)
- Auth: Working with admin account

**Blocker Resolved**: CORS "Failed to fetch" was caused by stale Lovable env vars in shell

**Next Major Milestone**: Deploy to vps2 and go live on ideafoundry.net
