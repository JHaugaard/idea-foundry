# Idea Foundry - Claude Context

## Project Overview
Personal knowledge management system built with React, TypeScript, Supabase, and AI-powered features (semantic search, tag suggestions, embeddings).

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + pgvector + Edge Functions)
- **AI**: OpenAI embeddings, semantic search, AI tag suggestions

## Current State
The codebase has accumulated technical debt from rapid AI-assisted development. Multiple overlapping components exist for the same functionality. A consolidation effort is underway.

---

# Component Consolidation Plan

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Complete

---

## Phase 1: Dead Code Removal [x] COMPLETE

Removed orphaned components (never imported anywhere):

| Component | Status | Notes |
|-----------|--------|-------|
| BasicSearchHome.tsx | [x] Deleted | Replaced by EnhancedSearch on Index page |
| SimilarNotesPanel.tsx | [x] Deleted | SimilarNotesWidget is the maintained version |
| EnhancedTagAutomationPanel.tsx | [x] Deleted | Never integrated |
| BatchLinkOperations.tsx | [x] Deleted | Never used |
| FloatingLinkButton.tsx | [x] Deleted | Never used |

**Completed**: December 13, 2024

---

## Phase 2: Link Search Consolidation [ ]

**Problem**: Two overlapping link search components
- `LinkSearchInterface.tsx` - Simpler, searches by link patterns
- `EnhancedLinkSearchInterface.tsx` - More features, Cmd+K integration

**Decision Required**: Which to keep? Or merge features?

### Checklist
- [ ] Review both components side-by-side
- [ ] Identify unique features in each
- [ ] Decide: keep one, merge, or keep both with clear separation
- [ ] Update all imports
- [ ] Delete deprecated component
- [ ] Test link search functionality

### Files Involved
- [src/components/LinkSearchInterface.tsx](src/components/LinkSearchInterface.tsx)
- [src/components/EnhancedLinkSearchInterface.tsx](src/components/EnhancedLinkSearchInterface.tsx)

---

## Phase 3: Similar Notes Consolidation [ ]

**Problem**: Two approaches to finding similar notes
- `SimilarNotesWidget.tsx` (ACTIVE) - Uses semantic embeddings via `match_notes` RPC
- `SimilarNotesPanel.tsx` (DELETED) - Used connection-based similarity

**Status**: Resolved by Phase 1 deletion. SimilarNotesWidget is the winner.

### Checklist
- [x] SimilarNotesPanel deleted
- [ ] Verify SimilarNotesWidget works correctly
- [ ] Consider if "hub notes" feature from Panel should be added to Widget

---

## Phase 4: Tag Automation Consolidation [ ]

**Problem**: Multiple overlapping tag components

| Component | Purpose | Status |
|-----------|---------|--------|
| TagInput.tsx | Core tag input with AI suggestions | KEEP - base component |
| InlineTagEditor.tsx | Wrapper around TagInput | KEEP - composition pattern |
| TagManagementDialog.tsx | Global tag operations (rename/merge/delete) | KEEP - different scope |
| BatchTagOperations.tsx | Batch operations on multiple notes | REVIEW - may overlap |
| TagAutomationPanel.tsx | AI suggestions (content + similarity) | KEEP |
| EnhancedTagAutomationPanel.tsx | Extended AI features | DELETED in Phase 1 |
| HashtagSuggestions.tsx | Autocomplete in textarea | KEEP - specific purpose |
| AITagSettings.tsx | Settings panel | KEEP - settings |

### Checklist
- [ ] Review TagManagementDialog vs BatchTagOperations - clarify scope
- [ ] Document when to use each tag component
- [ ] Consider consolidating if significant overlap

### Files Involved
- [src/components/TagManagementDialog.tsx](src/components/TagManagementDialog.tsx)
- [src/components/BatchTagOperations.tsx](src/components/BatchTagOperations.tsx)
- [src/components/TagAutomationPanel.tsx](src/components/TagAutomationPanel.tsx)

---

## Phase 5: Search Architecture Review [ ]

**Current State**: 6 search-related components, now 5 after BasicSearchHome removal

| Component | Purpose | Verdict |
|-----------|---------|---------|
| SearchInterface.tsx | Main orchestrator | KEEP |
| EnhancedSearch.tsx | Text input, filters, suggestions | KEEP |
| SemanticSearchPanel.tsx | AI-powered embedding search | KEEP - distinct purpose |
| AdvancedSearchBuilder.tsx | Complex query builder dialog | KEEP |
| OfflineSearchProvider.tsx | Caching infrastructure | KEEP |

**Assessment**: The remaining search components have clear, non-overlapping purposes. No immediate consolidation needed.

### Future Consideration
If refactoring search, consider this structure:
```
src/components/search/
├── SearchProvider.tsx       # Context + state (absorbs OfflineSearchProvider)
├── SearchInput.tsx          # The input UI (absorbs EnhancedSearch)
├── SearchFilters.tsx        # Advanced filters (absorbs AdvancedSearchBuilder)
├── SearchResults.tsx        # Results display
├── SemanticSearch.tsx       # AI search (absorbs SemanticSearchPanel)
└── useSearch.ts             # Unified hook
```

---

## Phase 6: General Cleanup [ ]

### Unused Hooks Audit
- [ ] Run import analysis on all hooks in `src/hooks/`
- [ ] Remove any orphaned hooks

### Component Organization
- [ ] Consider grouping related components into folders
- [ ] Update imports to use barrel exports where appropriate

---

## How to Use This Plan

### Starting a Session
1. Read this file to understand current state
2. Pick a phase that's not complete
3. Work through the checklist items
4. Update this file with progress

### Completing a Phase
1. Mark all checklist items as [x]
2. Update the phase status header
3. Add completion date
4. Note any discoveries or decisions made

### If You Get Interrupted
- Mark current item as [~] in progress
- Add a note about where you stopped
- The next session can pick up from there

---

## Related Documentation
- [search/CLAUDE.md](search/CLAUDE.md) - Search sub-project deep dive
- [ui-ux/CLAUDE.md](ui-ux/CLAUDE.md) - UI/UX exploration

## Key Directories
- `src/components/` - React components (main consolidation target)
- `src/hooks/` - Custom React hooks
- `src/pages/` - Page components
- `supabase/functions/` - Edge functions (AI features)
