# tg-freelance

Telegram Mini App for freelance tasks.

## Frontend Auto Deploy

Frontend deploy runs automatically from GitHub Actions on push to `main` (for files under `frontend/`).

## Backend Auto Deploy

Backend deploy runs automatically from GitHub Actions on push to `main` (for files under `backend/`).

### 1. GitHub Secrets

In GitHub repo settings, add:

- `DEPLOY_HOST` - `85.198.65.147`
- `DEPLOY_PORT` - `22`
- `DEPLOY_USER` - `root`
- `DEPLOY_SSH_KEY` - private SSH key for deploy

Same secrets are used by both deploy workflows:

- `.github/workflows/deploy-frontend.yml`
- `.github/workflows/deploy-backend.yml`

### 2. Deploy key setup (local machine)

Generate a dedicated key:

```bash
ssh-keygen -t ed25519 -C "tg-freelance-deploy" -f ~/.ssh/tg_freelance_deploy
```

Copy public key to server:

```bash
ssh-copy-id -i ~/.ssh/tg_freelance_deploy.pub root@85.198.65.147
```

Copy private key content to GitHub Secret `DEPLOY_SSH_KEY`:

```bash
cat ~/.ssh/tg_freelance_deploy
```

### 3. Server requirements

Server should contain:

- repo at `/opt/tg-freelance`
- deploy script at `/opt/tg-freelance/scripts/deploy-frontend.sh`
- deploy script at `/opt/tg-freelance/scripts/deploy-backend.sh`
- systemd service `tg-freelance-backend`
- nginx serving `/var/www/tg-freelance`

### 4. Manual deploy fallback

```bash
ssh root@85.198.65.147
cd /opt/tg-freelance
git pull --ff-only
bash scripts/deploy-frontend.sh
bash scripts/deploy-backend.sh
```

## Run Locally

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate -- --name init
npm run dev
```

Backend URL: `http://localhost:3001`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`
