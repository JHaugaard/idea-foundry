## IDEA-FOUNDRY / INFRASTRUCTURE SPLIT - GITHUB PROCESS

### Step 1: Create Infrastructure Repo (New)

```bash
# Create new repo on GitHub first (via web UI)
# Then locally:
mkdir ~/Developer/infrastructure  # or /Volumes/IdeaFoundryDev/infrastructure
cd ~/Developer/infrastructure
git init
git remote add origin https://github.com/yourusername/infrastructure.git

# Copy files FROM idea-foundry TO infrastructure
cp dev/develop/idea-foundry/docs/development-environment-setup-guide.md \
   docs/00-complete-guide.md

cp ~/dev/develop/idea-foundry/docs/INFRASTRUCTURE_REPO_README.md \
   README.md

# Create structure, add files
# ...

# Initial commit to infrastructure repo
git add .
git commit -m "Initial infrastructure repository setup"
git push -u origin main
```

### Step 2: Clean Up Idea Foundry Repo (Existing)

```bash
cd ~/Developer/idea-foundry

# Remove files that moved to infrastructure repo
git rm docs/development-environment-setup-guide.md
git rm docs/INFRASTRUCTURE_REPO_README.md

# Add reference to infrastructure repo
echo "# Infrastructure

This application's infrastructure is managed in a separate repository:
https://github.com/yourusername/infrastructure

See that repo for:
- VPS setup and configuration
- Docker Compose files
- Nginx configurations
- Deployment scripts
- Monitoring and backup procedures
" > docs/infrastructure-reference.md

# Stage changes
git add .

# Commit the reorganization
git commit -m "Refactor: Move infrastructure docs to dedicated repository

- Moved development-environment-setup-guide.md to infrastructure repo
- Moved infrastructure README to infrastructure repo
- Added infrastructure-reference.md with link to new repo
- Separating infrastructure (reusable) from application (project-specific)

Infrastructure repo: https://github.com/yourusername/infrastructure"

# Push to GitHub
git push origin main
```

### Why This Matters

**Git tracks history:**



- Without committing, GitHub doesn't know about the changes
- Other machines (or you later) would see stale files
- Lovable integration would be confused
- Your backup (GitHub) wouldn't reflect reality

**Proper git hygiene:**



- ✅ Remove files you moved (`git rm`)
- ✅ Add files you created (`git add`)
- ✅ Commit with clear message explaining *why*
- ✅ Push to make changes official

**What happens if you DON'T commit/push:**



- Your local repo has changes
- GitHub still shows old files
- If you clone fresh elsewhere, you get the old structure
- Lovable might try to edit files that don't exist locally
- Confusion and potential merge conflicts

## Best Practice Workflow

**Every time you make structural changes:**



```bash
# 1. Make changes (move files, create files, delete files)

# 2. Check what changed
git status

# 3. Review changes carefully
git diff  # for modified files
# Look at what's added/removed

# 4. Stage changes
git add .  # or specific files
git rm <file>  # for deleted files

# 5. Commit with descriptive message
git commit -m "Clear description of WHAT and WHY"

# 6. Push to GitHub
git push origin main

# 7. Verify on GitHub web UI
# Check that GitHub shows what you expect
```

## Your Learning Checklist ✅

You understand:



- ✅ Git tracks changes locally until you push
- ✅ `git rm` for files you moved/deleted
- ✅ `git add` for files you created/modified
- ✅ Commit messages explain the "why"
- ✅ Push makes changes official on GitHub
- ✅ Both repos (infrastructure + app) need proper commits
- ✅ GitHub is your source of truth, not local files

## Pro Tip: Commit Message Format

```bash
# Good commit message structure:
git commit -m "Type: Brief summary

Detailed explanation of what changed and why.
Can be multiple lines.

Refs: #issue-number (if applicable)"

# Example:
git commit -m "Refactor: Separate infrastructure into dedicated repo

Moved infrastructure docs and configs to new 'infrastructure' repo
for better organization and reusability across projects.

Changes:
- Removed development-environment-setup-guide.md
- Removed INFRASTRUCTURE_REPO_README.md
- Added infrastructure-reference.md with link to new repo

This allows infrastructure to evolve independently and be
reused by future projects without coupling."
```

------

**You're learning correctly!** This is exactly the kind of thinking that prevents "I thought I committed that?" moments.

 

Git is your safety net, but only if you commit and push regularly. 💪

 

Any other questions about the reorganization process?