# Save This Project (Never Lose It)

Your project is now under **Git** version control. The initial commit is done. To keep it safe off your machine, push it to a remote (e.g. GitHub).

---

## 1. Create a repository on GitHub (one-time)

1. Go to [github.com](https://github.com) and sign in.
2. Click **+** → **New repository**.
3. Name it (e.g. `givrwrld-servers`).
4. Choose **Private** if you don’t want it public.
5. **Do not** add a README, .gitignore, or license (you already have them).
6. Click **Create repository**.

---

## 2. Add the remote and push (one-time per machine)

In a terminal, from this project folder:

```bash
# Replace YOUR_USERNAME and YOUR_REPO with your GitHub username and repo name
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push everything (main or master)
git branch -M main
git push -u origin main
```

If GitHub asks for auth, use a **Personal Access Token** (Settings → Developer settings → Personal access tokens) as the password, or set up **Git Credential Manager** / **SSH keys**.

---

## 3. Keep it updated (whenever you make changes)

```bash
git add -A
git commit -m "Describe what you changed"
git push
```

---

## What’s already done

- **Git repo** initialized in this folder.
- **Initial commit** created with 585 files (code, docs, config). Secrets and `node_modules` are in `.gitignore` and are **not** committed.
- **`.gitignore`** excludes: `.env`, `api/.env`, `pterodactyl/.env`, `node_modules`, `node_modules_backup`, `AES_KEY.txt`, `PASSWORDS.txt`, and similar sensitive files.

Once you run the commands in **§2**, your project is saved on GitHub and you can clone or restore it from there anytime.
