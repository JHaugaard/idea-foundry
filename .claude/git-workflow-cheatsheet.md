# Git UI Experimentation Workflow

A step-by-step guide for safely experimenting with UI changes using git branches.

---

## Scenario 1: Accept Changes (Merge Back to Main)

Use this when your UI changes look good and you want to keep them.

### Steps

1. **Create and switch to a feature branch**
   ```bash
   git checkout -b feat/describe-your-change
   ```

2. **Make your UI changes**
   - Edit files as needed in your editor

3. **Stage and commit your changes**
   ```bash
   git add .
   git commit -m "feat: add descriptive message of what changed"
   ```
   - Conventional commit format: `feat:`, `fix:`, `refactor:`, etc.

4. **Test locally**
   - Run your dev server: `npm run dev`
   - Review changes in localhost
   - Verify functionality

5. **Push the branch to remote**
   ```bash
   git push -u origin feat/describe-your-change
   ```

6. **Merge back to main**
   ```bash
   git checkout main
   git pull origin main
   git merge feat/describe-your-change
   ```

7. **Push main with merged changes**
   ```bash
   git push origin main
   ```

8. **Delete the feature branch (optional but recommended)**
   ```bash
   git branch -d feat/describe-your-change
   git push origin --delete feat/describe-your-change
   ```

---

## Scenario 2: Discard Changes (Delete Branch)

Use this when your UI changes don't look good and you want to throw them away.

### Steps

1. **Create and switch to a feature branch**
   ```bash
   git checkout -b feat/describe-your-change
   ```

2. **Make your UI changes**
   - Edit files as needed in your editor

3. **Stage and commit your changes**
   ```bash
   git add .
   git commit -m "feat: add descriptive message of what changed"
   ```

4. **Test locally**
   - Run your dev server: `npm run dev`
   - Review changes in localhost
   - Verify functionality

5. **Decide the changes aren't what you want**

6. **Switch back to main**
   ```bash
   git checkout main
   ```

7. **Delete the feature branch locally**
   ```bash
   git branch -d feat/describe-your-change
   ```
   - Use `-D` (force delete) if git complains: `git branch -D feat/describe-your-change`

8. **Delete the remote branch (if you already pushed)**
   ```bash
   git push origin --delete feat/describe-your-change
   ```

9. **Verify you're back on main with no unwanted changes**
   ```bash
   git status
   ```

---

## Scenario 3: Keep Branch for Later

Use this when your changes are interesting but not ready to merge yet.

### Steps

1. **Create and switch to a feature branch**
   ```bash
   git checkout -b feat/describe-your-change
   ```

2. **Make your UI changes**
   - Edit files as needed in your editor

3. **Stage and commit your changes**
   ```bash
   git add .
   git commit -m "feat: add descriptive message of what changed"
   ```

4. **Test locally**
   - Run your dev server: `npm run dev`
   - Review changes in localhost
   - Verify functionality

5. **Decide to save the branch for later**

6. **Push the branch to remote to save it**
   ```bash
   git push -u origin feat/describe-your-change
   ```

7. **Switch back to main when you're done experimenting**
   ```bash
   git checkout main
   ```

8. **Later, when you want to work on it again**
   ```bash
   git checkout feat/describe-your-change
   ```
   - Or: `git checkout -b feat/describe-your-change origin/feat/describe-your-change` if it's the first time pulling it

9. **When ready to merge eventually, follow Scenario 1 from step 6 onwards**

---

## Quick Reference

| Scenario | Key Commands |
|----------|--------------|
| **Accept** | `git checkout -b feat/...` → make changes → `git add . && git commit` → test locally → `git push -u` → `git checkout main && git merge` → `git push origin main` |
| **Discard** | `git checkout -b feat/...` → make changes → `git add . && git commit` → test locally → `git checkout main` → `git branch -D feat/...` |
| **Keep for Later** | `git checkout -b feat/...` → make changes → `git add . && git commit` → test locally → `git push -u origin` → `git checkout main` |

---

## Tips

- Always test locally before deciding to keep or discard
- Branch names should be descriptive: `feat/dark-mode`, `fix/button-alignment`, etc.
- Commit messages help you remember what you changed: be specific
- Use `git status` frequently to see where you are
- Use `git log --oneline` to see recent commits on your branch
- If you've pushed and want to discard, delete the remote branch with `--delete`
- Keep `main` always in a working state
