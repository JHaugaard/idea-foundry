# The Developer's Workshop: Harvesting "Wins"

In software engineering, the difference between a "Junior" and a "Senior" developer isn't just coding speed—it's **Library Management**. A senior developer never solves the same problem twice.

Here is how you turn project-specific wins (like your "Curator Queue" or "Vector Search Hook") into reusable Arsenal weapons.

## 1. The Hierarchy of Reuse

### Level 1: The "Snippet File" (Low Effort)
*   **What**: A simple markdown file or Gist where you dump code blocks.
*   **Best For**: SQL Migrations, unique Regex patterns, complex Typescript interfaces.
*   **Your Foundry Win**: The `curator_queue.sql` migration. You will need a job queue again. Save this Schema.

### Level 2: The "Utility Library" (Medium Effort)
*   **What**: A Git repository (e.g., `haugaard-utils`) containing strict, generic functions.
*   **Best For**: `useSupabaseStorage.tsx`, `useNotes.tsx`.
*   **The Trick**: You must strip the "Business Logic."
    *   *Project Version*: `uploadFile('idea-foundry-bucket', file)`
    *   *Library Version*: `uploadFile(bucketName, file)`
    *   *Action*: Copy your `src/hooks` folder to a separate repo. Refactor them to accept configuration as arguments.

### Level 3: The "Starter Kit" / Boilerplate (High Effort)
*   **What**: A full "Reference Architecture" (like a template).
*   **Best For**: The entire **Idea Foundry Backend**.
*   **The Vision**: Next time you want to build an app, you don't start `npm init`. You clone `haugaard-stack-v1`.
    *   It already has: Supabase w/ pgvector, Authentication, Tailwind UI, The "Curator" Queue pattern.
    *   *You start at the finish line of your last project.*

## 2. Practical "Harvesting" for You

Right now, don't over-engineer a library. Do this **"Harvest Protocol"**:

1.  **Identify the Gem**: "This mechanism for handling tags is really smart."
2.  **Generalize It**: Copy the file to a `_templates` folder in your knowledge base. Remove the word "Note" and replace it with "Item" or "Entity."
3.  **Document It**: Write 3 lines at the top:
    *   *What does this solve?*
    *   *What dependencies does it need?*
    *   *Example usage.*

### Candidates for Harvest from Idea Foundry:
1.  **The "Curator" Pattern**: The SQL + Trigger + Edge Function combo for background processing. Universal gold.
2.  **The Hybrid Search Function**: Your `hybrid_search_notes` SQL function. It’s a pain to write from scratch. Save it.
3.  **The B2 Storage Hook**: `useSupabaseStorage.tsx` is robust. It belongs in your toolkit.

**The Golden Rule**: "Write code for your project first. Extract it for your library second." Never try to write the library first; you'll build things you don't need.
