# Claude Code Session Context

## Project: Idea Foundey
**Stack**: React + Supabase + Docker + Hostinger VPS
**Last Updated**: 2025-10-25

---

## Current Sprint

### Active Work
- [ ] Feature/task I'm working on right now
- [ ] Next immediate task

### Recently Completed
- ✅ Completed item with date (YYYY-MM-DD)
- ✅ Another completed item

---

## Today's Session - YYYY-MM-DD

### Objective
What I'm trying to accomplish today

### Progress
- [Time] Did this thing
- [Time] Then did this thing
- [Time] Ran into issue with X, solved by Y

### Code Changes
- **Modified**: `path/to/file.ts` - What changed and why
- **Added**: `path/to/new-file.ts` - Purpose of new file
- **Deleted**: `path/to/old-file.ts` - Why removed

### Decisions Made
- Chose approach X over Y because...
- Decided to postpone Z until...

### Blockers / Issues
- ⚠️ Problem description
  - Attempted solutions
  - Current status
  - Next steps to resolve

---

## Technical Context

### MCP Servers in Use
- **Supabase MCP** (v1.2.3) - Database + Storage
- **Filesystem MCP** (v2.1.0) - Local file ops
- **GitHub MCP** (v3.0.1) - Version control

### Database Schema
\`\`\`sql
-- Quick reference for tables
galleries (id, name, description, cover_photo_url, created_at)
photos (id, gallery_id, filename, url, thumbnail_url, uploaded_at)
\`\`\`

### Environment
- **Local Dev**: macOS, Docker Desktop
- **Staging**: Hostinger VPS (staging.yourdomain.com)
- **Production**: Hostinger VPS (yourdomain.com)

---

## Next Session TODO
- [ ] Top priority task
- [ ] Second priority
- [ ] Nice to have if time

### Commands to Resume Work
\`\`\`bash
# Start MCP servers
cd mcp-servers/docker && docker compose up -d

# Start dev server
npm run dev

`\`\`

---

## Quick Links
- Supabase Dashboard:
- GitHub Repo:
- Staging Site: 
- Production Site: