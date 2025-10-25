# Development Environment Setup Guide
## Idea Foundry Project - Infrastructure-First Approach

**Last Updated:** October 24, 2025
**Purpose:** Complete guide for building production infrastructure first, then developing locally against real backend, culminating in professional CI/CD deployment
**Philosophy:** Learn best practices first, infrastructure before application, reconfigure as you grow

---

## Table of Contents

1. [Overview & Philosophy](#overview--philosophy)
2. [The Infrastructure-First Approach](#the-infrastructure-first-approach)
3. [Your Learning Journey](#your-learning-journey)
4. [VPS Architecture Strategy](#vps-architecture-strategy)
5. [Phase 1: VPS Infrastructure Setup](#phase-1-vps-infrastructure-setup)
6. [Phase 2: Local Development Environment](#phase-2-local-development-environment)
7. [Phase 3: Development Workflow](#phase-3-development-workflow)
8. [Phase 4: CI/CD & Production Deployment](#phase-4-cicd--production-deployment)
9. [Phase 5: Graduating from External Drive](#phase-5-graduating-from-external-drive)
10. [VPS Monitoring & Split Decision](#vps-monitoring--split-decision)
11. [Fixing iCloud + Git Issues](#fixing-icloud--git-issues)
12. [Performance Benchmarks](#performance-benchmarks)
13. [Troubleshooting](#troubleshooting)
14. [Quick Reference](#quick-reference)

---

## Overview & Philosophy

### The Traditional Approach (What Most Developers Do)
```
Develop locally → Deploy everything at once → Fix production issues → Learn infrastructure under pressure
```

**Problems:**
- Infrastructure issues discovered during launch panic
- Local development differs from production (surprises)
- Complex deployment (everything at once)
- Limited infrastructure knowledge

### The Infrastructure-First Approach (What You're Doing)
```
Build infrastructure → Develop against real backend → Deploy frontend only → Production ready
```

**Benefits:**
- Infrastructure is battle-tested before launch
- Development uses production backend (no surprises)
- Deployment is incremental and low-risk
- Deep infrastructure knowledge from day one
- VPS serves multiple projects (Supabase/Ollama reusable)

### Why This Path is Smart

**You're learning:**
- Docker orchestration and containerization
- VPS management and Linux administration
- Self-hosted Supabase (PostgreSQL, Auth, Storage, Realtime)
- AI model deployment with Ollama
- Nginx reverse proxy and SSL/TLS configuration
- CI/CD pipeline construction
- Monitoring, backups, and disaster recovery

**By the time you launch**, you'll have production-grade DevOps skills that most developers never acquire.

### The Goal: Graduation

**Development Phase** (Thunderbolt 5 External Drive):
- Physical drive moves between machines
- All code and Docker volumes portable
- Learning Docker, VPS, infrastructure
- **External drive is central to workflow**

**Production Phase** (Cloud-Native):
- Code in GitHub (version controlled)
- Backend on VPS (self-hosted)
- CI/CD automates deployment
- **External drive becomes optional**

You'll naturally graduate from "external drive workflow" to "professional cloud-native development" as you build confidence and infrastructure.

---

## The Infrastructure-First Approach

### Core Principle

**Front-load the hard work:** Set up production infrastructure (VPS with Supabase, Ollama, n8n) **before** heavy application development.

### What This Means

**Phase 1: Build Infrastructure First** (2-8 weeks)
- Provision VPS on Hostinger
- Deploy self-hosted Supabase stack
- Set up Ollama with local LLM models
- Configure n8n for automation
- Implement SSL, backups, monitoring

**Phase 2: Develop Locally → VPS Backend** (ongoing)
- Code on Thunderbolt 5 external SSD
- Frontend runs locally (fast hot-reload)
- API calls go to VPS Supabase (shared data)
- Embeddings use VPS Ollama (consistent results)
- Physical drive moves between MacBook/Desktop

**Phase 3: CI/CD When Ready** (when app is stable)
- Build GitHub Actions pipeline
- Deploy frontend to VPS
- Backend already running (no surprises)
- Production ready

### Why This Works

**Stability**: Backend infrastructure is production-ready from day one
**Consistency**: Same data across all your machines (shared VPS backend)
**Learning**: Master DevOps while developing (not in a panic later)
**Deployment**: Trivial - just add frontend to existing infrastructure
**Reusability**: Supabase and Ollama serve future projects too

---

## Your Learning Journey

### Timeline & Milestones

**Weeks 1-2: VPS Foundation**
- ✅ Provision Hostinger VPS
- ✅ Install Docker + Docker Compose
- ✅ Configure Nginx reverse proxy
- ✅ Set up SSL certificates (Let's Encrypt)
- **Milestone**: Can access VPS via HTTPS

**Weeks 3-4: Supabase Deployment**
- ✅ Deploy PostgreSQL with pgvector
- ✅ Deploy Supabase services (Auth, Storage, API, Realtime)
- ✅ Configure Supabase Studio
- ✅ Test API endpoints from laptop
- **Milestone**: Can create/read data via Supabase API from your laptop

**Week 5: Ollama & AI**
- ✅ Install Ollama on VPS
- ✅ Download and test LLM models (nomic-embed-text, llama3.1)
- ✅ Test embedding generation via API
- **Milestone**: Can generate embeddings from your laptop

**Week 6: n8n & Automation** (optional, can defer)
- ✅ Deploy n8n workflow automation
- ✅ Configure basic workflows
- **Milestone**: n8n accessible and functional

**Week 7: Hardening & Monitoring**
- ✅ Security hardening (firewall, fail2ban)
- ✅ Set up monitoring (htop, docker stats, or Grafana)
- ✅ Configure automated backups
- ✅ Document recovery procedures
- **Milestone**: Production-grade infrastructure

**Week 8+: Local Development**
- ✅ Set up Thunderbolt 5 external SSD
- ✅ Clone project to external drive
- ✅ Configure frontend to point to VPS backend
- ✅ Develop features locally
- **Milestone**: Smooth development workflow

**Later: CI/CD & Launch**
- ✅ Build GitHub Actions pipeline
- ✅ Deploy frontend to VPS
- ✅ Go live!
- **Milestone**: Production application running

### Skills You'll Master

**Infrastructure:**
- Linux server administration
- Docker containerization
- Nginx web server configuration
- SSL/TLS certificate management
- Database administration (PostgreSQL)
- Backup and disaster recovery

**DevOps:**
- CI/CD pipeline construction
- GitHub Actions workflows
- Deployment automation
- Monitoring and alerting
- Log management

**AI/ML Operations:**
- LLM model deployment
- Ollama configuration and optimization
- Embedding generation at scale
- GPU passthrough (if applicable)

**Development:**
- Multi-machine git workflow
- Environment configuration
- API integration
- Docker Compose orchestration

---

## VPS Architecture Strategy

### Recommended Path: Start Simple, Split When Needed

**Start: Single VPS (16GB RAM, 8 CPU cores)**
```
VPS 1: All-in-One (Hostinger - ~$40-50/month)
├── Supabase Stack
│   ├── PostgreSQL + pgvector (4-6GB RAM)
│   ├── PostgREST API (512MB)
│   ├── GoTrue Auth (256MB)
│   ├── Realtime (256MB)
│   ├── Storage API (256MB)
│   └── Supabase Studio (512MB)
├── Ollama + Models (6-8GB RAM)
├── n8n (512MB RAM)
├── Frontend (when deployed - 256MB)
└── Nginx Reverse Proxy (256MB)

Total: ~14-16GB RAM usage
```

**Pros:**
- ✅ Single server to learn and manage
- ✅ Lower cost during learning phase
- ✅ Simpler networking (everything on localhost)
- ✅ One backup strategy
- ✅ Easy to monitor

**Cons:**
- ⚠️ Potential resource contention (Ollama vs PostgreSQL)
- ⚠️ Single point of failure
- ⚠️ Can't scale components independently

### When to Split to 2-VPS Architecture

**Monitor for these indicators** (see [VPS Monitoring](#vps-monitoring--split-decision) section):
- PostgreSQL queries slow during Ollama inference (>100ms increase)
- RAM consistently >80% usage
- CPU constantly >70% for extended periods
- Ollama generation causing database lock contention

**If you hit these limits → Split:**

```
VPS 1: Core Services (8GB RAM, 4 CPU)
├── Supabase Stack (all services)
├── Frontend application(s)
├── n8n workflow automation
└── Nginx Reverse Proxy
Cost: ~$25-30/month

VPS 2: AI/Compute (16GB RAM, 8 CPU)
├── Ollama + LLM Models
├── Heavy compute tasks
└── Future AI experiments
Cost: ~$40-50/month

Total: ~$65-80/month
```

**Benefits of Split:**
- 🚀 Ollama inference doesn't impact database
- 🚀 Can upgrade AI server independently
- 🚀 Experiment with models without risking data
- 🚀 Better fault tolerance

### Hostinger VPS Specifications

**Recommended Starting VPS:**
- **Plan**: VPS 4 or equivalent
- **CPU**: 8 vCores (shared) or 4 cores (dedicated)
- **RAM**: 16GB
- **Storage**: 100GB NVMe SSD (minimum)
- **Bandwidth**: Unlimited or 8TB+
- **Location**: Closest datacenter to you
- **OS**: Ubuntu 22.04 LTS (recommended)

**Check for:**
- Private networking capability (for future 2-VPS setup)
- Snapshot/backup options
- Easy VPS resize option (for scaling up)
- SSH key authentication support

**Cost Estimate**: $40-60/month depending on region

---

## Phase 1: VPS Infrastructure Setup

### Step 1: Provision VPS on Hostinger

**1. Order VPS**
- Log into Hostinger panel
- Select VPS plan (16GB RAM, 8 CPU recommended)
- Choose datacenter location (nearest to you)
- Select OS: Ubuntu 22.04 LTS
- Add SSH key during setup (generate if needed)

**2. Initial Connection**
```bash
# SSH into your VPS (from your laptop)
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Create non-root user (security best practice)
adduser deploy
usermod -aG sudo deploy

# Copy SSH key to new user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy/

# Exit and reconnect as deploy user
exit
ssh deploy@your-vps-ip
```

**3. Basic Security**
```bash
# Disable root SSH login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
sudo systemctl restart sshd

# Set up firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Install fail2ban (brute force protection)
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

### Step 2: Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in for group to take effect
exit
ssh deploy@your-vps-ip

# Verify Docker
docker --version

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify
docker compose version
```

### Step 3: Set Up Nginx Reverse Proxy & SSL

**1. Install Nginx**
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
```

**2. Configure Domain Names**

Before proceeding, set up DNS A records pointing to your VPS IP:
```
supabase.yourdomain.com  →  your-vps-ip
ollama.yourdomain.com    →  your-vps-ip
n8n.yourdomain.com       →  your-vps-ip
app.yourdomain.com       →  your-vps-ip  (for frontend later)
```

**3. Install Certbot for SSL**
```bash
sudo apt install certbot python3-certbot-nginx -y
```

**4. We'll configure Nginx after deploying services** (need services running first)

### Step 4: Deploy Self-Hosted Supabase

**1. Create Project Directory**
```bash
mkdir -p ~/supabase
cd ~/supabase
```

**2. Download Supabase Docker Compose**
```bash
# Clone Supabase repository
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Copy example env file
cp .env.example .env
```

**3. Configure Environment Variables**
```bash
nano .env

# CRITICAL: Change these from defaults!
POSTGRES_PASSWORD=your-super-secure-password-here
JWT_SECRET=your-jwt-secret-at-least-32-characters-long
ANON_KEY=generate-this-with-supabase-cli
SERVICE_ROLE_KEY=generate-this-with-supabase-cli

# Set your domain
SITE_URL=https://supabase.yourdomain.com
API_EXTERNAL_URL=https://supabase.yourdomain.com

# Save and exit (Ctrl+X, Y, Enter)
```

**4. Generate Keys**
```bash
# Install Supabase CLI on your laptop (not VPS)
# On your MacBook:
brew install supabase/tap/supabase

# Generate JWT secret
openssl rand -base64 32

# Generate ANON and SERVICE_ROLE keys
# Use Supabase JWT generator or online tool with your JWT_SECRET
# Copy these back to VPS .env file
```

**5. Start Supabase Stack**
```bash
# On VPS
cd ~/supabase/supabase/docker

# Start all services
docker compose up -d

# Verify all containers running
docker compose ps

# Check logs
docker compose logs -f
```

**6. Configure Nginx for Supabase**
```bash
sudo nano /etc/nginx/sites-available/supabase

# Add this configuration:
```

```nginx
server {
    listen 80;
    server_name supabase.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d supabase.yourdomain.com

# Follow prompts, choose redirect HTTP to HTTPS
```

**7. Test Supabase**
```bash
# From your laptop
curl https://supabase.yourdomain.com/rest/v1/

# Should return API information
```

**8. Access Supabase Studio**
- Open browser: `https://supabase.yourdomain.com`
- Login with credentials from `.env` file
- You should see Supabase Studio dashboard

### Step 5: Deploy Ollama

**1. Create Ollama Directory**
```bash
mkdir -p ~/ollama
cd ~/ollama
```

**2. Create Docker Compose File**
```bash
nano docker-compose.yml
```

```yaml
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama-models:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0
    # Uncomment if you have GPU
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: 1
    #           capabilities: [gpu]

volumes:
  ollama-models:
```

**3. Start Ollama**
```bash
docker compose up -d

# Verify running
docker compose logs -f
```

**4. Download Models**
```bash
# Pull embedding model (for semantic search)
docker exec ollama ollama pull nomic-embed-text

# Pull LLM for tag suggestions, summaries, etc.
docker exec ollama ollama pull llama3.1:8b

# Or smaller model for faster inference
docker exec ollama ollama pull mistral:7b

# Verify models
docker exec ollama ollama list
```

**5. Test Ollama**
```bash
# Test generation
docker exec ollama ollama run llama3.1:8b "Hello, how are you?"

# Test embedding (from your laptop via API)
curl http://your-vps-ip:11434/api/embeddings \
  -d '{"model": "nomic-embed-text", "prompt": "test"}'
```

**6. Configure Nginx for Ollama**
```bash
sudo nano /etc/nginx/sites-available/ollama
```

```nginx
server {
    listen 80;
    server_name ollama.yourdomain.com;

    location / {
        proxy_pass http://localhost:11434;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Increase timeout for long inference
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
}
```

```bash
# Enable and get SSL
sudo ln -s /etc/nginx/sites-available/ollama /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d ollama.yourdomain.com
```

### Step 6: Deploy n8n (Optional - Can Defer)

**1. Create n8n Directory**
```bash
mkdir -p ~/n8n
cd ~/n8n
```

**2. Create Docker Compose**
```bash
nano docker-compose.yml
```

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=n8n.yourdomain.com
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://n8n.yourdomain.com/
      - GENERIC_TIMEZONE=America/New_York  # Adjust to your timezone
    volumes:
      - n8n-data:/home/node/.n8n

volumes:
  n8n-data:
```

**3. Start n8n**
```bash
docker compose up -d
```

**4. Configure Nginx for n8n**
```bash
sudo nano /etc/nginx/sites-available/n8n
```

```nginx
server {
    listen 80;
    server_name n8n.yourdomain.com;

    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d n8n.yourdomain.com
```

**5. Access n8n**
- Browser: `https://n8n.yourdomain.com`
- Create admin account on first visit

### Step 7: Set Up Monitoring

**1. Install htop (simple monitoring)**
```bash
sudo apt install htop -y

# Run to see resource usage
htop
```

**2. Monitor Docker Containers**
```bash
# See container resource usage
docker stats

# See logs for specific service
docker compose -f ~/supabase/supabase/docker/docker-compose.yml logs -f postgres
```

**3. Create Monitoring Script**
```bash
nano ~/monitor.sh
```

```bash
#!/bin/bash
echo "=== VPS Resource Usage ==="
echo ""
echo "CPU & Memory:"
free -h
echo ""
echo "Disk Usage:"
df -h /
echo ""
echo "Docker Containers:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
echo ""
echo "Top Processes:"
ps aux --sort=-%mem | head -10
```

```bash
chmod +x ~/monitor.sh

# Run anytime
./monitor.sh
```

### Step 8: Configure Backups

**1. PostgreSQL Backups**
```bash
# Create backup directory
mkdir -p ~/backups/postgres

# Create backup script
nano ~/backup-postgres.sh
```

```bash
#!/bin/bash
BACKUP_DIR=~/backups/postgres
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
POSTGRES_CONTAINER="supabase-db"  # Adjust to actual container name

# Backup database
docker exec $POSTGRES_CONTAINER pg_dumpall -U postgres > \
  $BACKUP_DIR/backup_$TIMESTAMP.sql

# Compress
gzip $BACKUP_DIR/backup_$TIMESTAMP.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$TIMESTAMP.sql.gz"
```

```bash
chmod +x ~/backup-postgres.sh

# Test
./backup-postgres.sh
```

**2. Automate with Cron**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/deploy/backup-postgres.sh >> /home/deploy/backup.log 2>&1
```

**3. Ollama Models Backup**
```bash
# Models are in Docker volume, backup periodically
docker run --rm -v ollama-models:/source \
  -v ~/backups/ollama:/backup \
  alpine tar -czf /backup/ollama-models-$(date +%Y%m%d).tar.gz -C /source .
```

### Step 9: VPS Infrastructure Complete!

**Verify Everything is Running:**
```bash
# Check all services
docker ps

# Test Supabase
curl https://supabase.yourdomain.com/rest/v1/

# Test Ollama
curl https://ollama.yourdomain.com/api/version

# Test n8n (should return HTML)
curl https://n8n.yourdomain.com/

# Check resource usage
./monitor.sh
```

**You now have:**
- ✅ Production-ready VPS infrastructure
- ✅ Self-hosted Supabase (PostgreSQL, Auth, Storage, API)
- ✅ Ollama with LLM models
- ✅ n8n workflow automation
- ✅ SSL certificates on all services
- ✅ Automated backups
- ✅ Monitoring tools

**Ready for Phase 2: Local Development!**

---

## Phase 2: Local Development Environment

### Overview

Now that your VPS backend is running, set up your local development environment:
- **Code + Docker volumes**: Thunderbolt 5 external SSD
- **Frontend**: Runs locally (fast hot-reload)
- **Backend APIs**: Point to VPS (Supabase, Ollama)
- **Physical drive**: Moves between MacBook and Desktop

### Step 1: Prepare Thunderbolt 5 External SSD

**1. Format Drive (APFS)**
```bash
# Connect Thunderbolt 5 SSD
# Open Disk Utility or use command line

# Find disk identifier
diskutil list

# Erase and format as APFS (replace disk2 with your actual disk)
diskutil eraseDisk APFS IdeaFoundryDev disk2

# Name it something recognizable
```

**2. Optimize for Development**
```bash
# Disable Spotlight indexing (HUGE performance gain)
sudo mdutil -i off /Volumes/IdeaFoundryDev

# Disable Time Machine backups (avoid constant churn)
sudo tmutil addexclusion /Volumes/IdeaFoundryDev

# Verify
mdutil -s /Volumes/IdeaFoundryDev
# Should show: "Indexing disabled"
```

**3. Create Directory Structure**
```bash
cd /Volumes/IdeaFoundryDev

# Create project directory
mkdir -p projects

# Optional: Docker volumes (if you want local Docker stack)
mkdir -p docker-volumes/{postgres,ollama-models,supabase-storage}
```

### Step 2: Clone Project to External SSD

**1. Fix iCloud Issues First** (see [iCloud section](#fixing-icloud--git-issues) if needed)

**2. Clone Repository**
```bash
cd /Volumes/IdeaFoundryDev/projects

# Clone your project
git clone https://github.com/yourusername/idea-foundry.git
cd idea-foundry

# Verify
git status
git remote -v
```

### Step 3: Configure Project for VPS Backend

**1. Create Environment File**
```bash
cd /Volumes/IdeaFoundryDev/projects/idea-foundry

# Copy example env (if you have one)
cp .env.example .env.local

# Or create new
nano .env.local
```

**2. Configure to Point to VPS**
```env
# Supabase Configuration (pointing to your VPS!)
VITE_SUPABASE_URL=https://supabase.yourdomain.com
VITE_SUPABASE_ANON_KEY=your-anon-key-from-vps-env-file

# Ollama Configuration
VITE_OLLAMA_URL=https://ollama.yourdomain.com

# n8n (if using)
VITE_N8N_WEBHOOK_URL=https://n8n.yourdomain.com/webhook

# Environment
VITE_ENVIRONMENT=development
```

**3. Install Dependencies**
```bash
# Install npm packages
npm install

# Or with yarn
yarn install
```

**4. Test Local Frontend → VPS Backend**
```bash
# Start development server
npm run dev

# Visit http://localhost:5173 (or configured port)
# Test creating a note - should save to VPS Supabase!
```

**Success!** Your frontend runs locally (fast), data saves to VPS (persistent).

### Step 4: Physical Drive Management

**Best Practices for Moving Drive Between Machines:**

**1. Safe Ejection (Critical!)**
```bash
# Before unplugging, ALWAYS eject properly
# macOS GUI: Right-click drive → Eject
# Or command line:
diskutil eject /Volumes/IdeaFoundryDev

# Wait for confirmation before unplugging
```

**2. Commit Before Moving**
```bash
# Before ejecting drive, commit your work
cd /Volumes/IdeaFoundryDev/projects/idea-foundry

# Check status
git status

# Commit changes
git add .
git commit -m "Work in progress"

# Optional: Push to GitHub (recommended)
git push origin main

# Now safe to eject and move drive
```

**3. Reconnecting on Other Machine**
```bash
# Connect drive to other machine
# macOS will auto-mount to /Volumes/IdeaFoundryDev

# Navigate to project
cd /Volumes/IdeaFoundryDev/projects/idea-foundry

# Pull latest (if you pushed from other machine)
git pull origin main

# Start working
npm run dev
```

**4. Handling Disconnections**

If drive disconnects unexpectedly:
```bash
# Reconnect drive
# Check git status
cd /Volumes/IdeaFoundryDev/projects/idea-foundry
git status

# If git complains, check health
git fsck

# If issues, you have backup on GitHub
git fetch origin
git reset --hard origin/main  # Nuclear option, loses local changes
```

### Step 5: Multi-Machine Git Workflow (Optional)

**Alternative to Physical Drive Movement:**

If you prefer to leave drive with one machine and use git sync:

**On MacBook (with external drive):**
```bash
cd /Volumes/IdeaFoundryDev/projects/idea-foundry

# Make changes
# ...

# Commit and push
git add .
git commit -m "Add feature"
git push origin main
```

**On Desktop (without external drive):**
```bash
# Clone to internal SSD
cd ~/Developer
git clone https://github.com/yourusername/idea-foundry.git
cd idea-foundry

# Same .env.local configuration (pointing to VPS)
nano .env.local
# Add same VPS URLs

# Pull latest
git pull origin main

# Work locally
npm run dev

# Both machines use same VPS backend (shared data!)
```

**Benefits:**
- Don't need to move drive
- Work from either machine anytime
- Git forces good commit discipline
- Same backend = consistent data

**Tradeoff:**
- Two copies of code (external SSD + internal SSD)
- Need to remember to push/pull
- Potential for merge conflicts (if forget to pull)

**Choose what works for your workflow.**

### Step 6: Local Development is Ready!

**You now have:**
- ✅ Thunderbolt 5 SSD with optimized settings
- ✅ Project cloned to external drive
- ✅ Frontend configured to use VPS backend
- ✅ Fast local development with production data
- ✅ Physical drive portability (or git sync alternative)

**Development workflow:**
```bash
# Connect external drive (if not already)
# Navigate to project
cd /Volumes/IdeaFoundryDev/projects/idea-foundry

# Start dev server
npm run dev

# Code changes hot-reload instantly (local)
# Data saves to VPS Supabase (persistent, shared)
# Embeddings generate via VPS Ollama (consistent)

# Commit often
git add .
git commit -m "Progress"
git push origin main

# Safe to eject and move to other machine
```

---

## Phase 3: Development Workflow

### Daily Workflow

**Morning (Starting Work):**
```bash
# 1. Connect Thunderbolt 5 drive (if needed)

# 2. Navigate to project
cd /Volumes/IdeaFoundryDev/projects/idea-foundry

# 3. Pull latest changes (if working across machines)
git pull origin main

# 4. Start development server
npm run dev

# 5. Open browser
open http://localhost:5173
```

**During Development:**
```bash
# Edit code in your IDE (VS Code, etc.)
# Changes hot-reload automatically

# Test features against real VPS backend
# - Create notes → saves to VPS Supabase
# - Generate embeddings → uses VPS Ollama
# - Upload files → stores in VPS Supabase Storage

# Monitor VPS (in separate terminal)
ssh deploy@your-vps-ip
./monitor.sh
# Watch for resource usage during your tests
```

**End of Day (or Switching Machines):**
```bash
# 1. Stop dev server (Ctrl+C)

# 2. Commit changes
git add .
git commit -m "Descriptive message about what you built"

# 3. Push to GitHub (recommended before moving drive)
git push origin main

# 4. Eject drive safely
diskutil eject /Volumes/IdeaFoundryDev

# 5. Unplug drive
# Now safe to move to other machine
```

### Testing Against Production Backend

**Benefits of VPS Backend During Development:**

**Data Persistence:**
- Create note on MacBook → see it on Desktop (same Supabase DB)
- No local DB sync issues
- Real production data structure

**Consistent AI:**
- Embeddings generated by same Ollama model/version
- Tag suggestions use same LLM (llama3.1)
- No "works on my machine" for AI features

**Performance Reality:**
- Experience actual API latency (network roundtrip)
- Discover slow queries early (optimize before launch)
- Database performance under real conditions

**Security Testing:**
- Test Row Level Security policies (Supabase RLS)
- Verify authentication flows
- Test file upload permissions

### Debugging Workflow

**Frontend Issues:**
```bash
# Check browser console (F12)
# Check network tab for API calls

# Frontend logs
npm run dev
# Watch terminal output
```

**Backend Issues:**
```bash
# SSH into VPS
ssh deploy@your-vps-ip

# Check Supabase logs
cd ~/supabase/supabase/docker
docker compose logs -f postgres
docker compose logs -f kong  # API gateway

# Check Ollama logs
cd ~/ollama
docker compose logs -f

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

**Database Queries:**
```bash
# Access Supabase Studio
open https://supabase.yourdomain.com

# Or connect via psql
ssh deploy@your-vps-ip
docker exec -it supabase-db psql -U postgres

# Run queries
\dt  -- list tables
SELECT * FROM notes LIMIT 10;
```

### Git Workflow with External Drive

**Feature Development:**
```bash
cd /Volumes/IdeaFoundryDev/projects/idea-foundry

# Create feature branch
git checkout -b feature/new-search-ui

# Make changes
# ...

# Commit incrementally
git add src/components/SearchInterface.tsx
git commit -m "Improve search input styling"

# More changes
# ...

# Push branch
git push origin feature/new-search-ui

# When done, merge on GitHub (pull request)
# Or merge locally:
git checkout main
git merge feature/new-search-ui
git push origin main
```

**Working with Lovable:**

Since you're using both Lovable and Claude Code:

**Option 1: Separate Branches**
```bash
# Lovable makes UI changes on its own branch
# You make backend changes on your branch
# Merge both when ready
```

**Option 2: Ownership Zones**
```bash
# Lovable owns: src/components/ui/, src/pages/
# Claude Code owns: src/lib/, src/services/, supabase/
# Less merge conflicts
```

**Option 3: Pull Often**
```bash
# If Lovable pushes to main
git pull origin main  # frequently

# Resolve conflicts locally before pushing
```

### Monitoring VPS Performance

**While Developing, Watch VPS:**

```bash
# SSH to VPS
ssh deploy@your-vps-ip

# Run monitoring script
./monitor.sh

# Watch for:
# - RAM usage approaching 80% (might need split)
# - CPU spikes during Ollama inference
# - PostgreSQL slow query warnings
# - Disk space usage
```

**Record Performance Notes:**
```bash
# Keep a log on VPS
nano ~/performance-log.md
```

```markdown
# VPS Performance Log

## 2025-10-24
- RAM usage: 12GB / 16GB (75%) during normal development
- Ollama inference (nomic-embed-text): 2-3s per note
- PostgreSQL queries: <50ms average
- No issues noticed

## 2025-11-01
- RAM usage spiked to 14GB (87%) when generating embeddings for 100 notes
- PostgreSQL queries slowed to 150ms during batch embedding
- **Decision point approaching: might need to split Ollama to VPS 2**
```

This helps you make informed decisions later.

---

## Phase 4: CI/CD & Production Deployment

### When You're Ready to Deploy

**Indicators You're Ready:**
- ✅ App is feature-complete (v1.0)
- ✅ VPS backend is stable (few issues)
- ✅ You trust the infrastructure (backups tested, recovery practiced)
- ✅ Security is hardened (firewall, SSL, RLS policies)
- ✅ Monitoring is in place

**Don't wait for perfection** - deploy when "good enough" and iterate.

### Step 1: Prepare Frontend for Production

**1. Environment Variables**
```bash
# Create production env file
nano .env.production
```

```env
# Production Supabase (same VPS, different key rotation strategy)
VITE_SUPABASE_URL=https://supabase.yourdomain.com
VITE_SUPABASE_ANON_KEY=your-anon-key

# Production Ollama
VITE_OLLAMA_URL=https://ollama.yourdomain.com

# Production mode
VITE_ENVIRONMENT=production
```

**2. Build Frontend**
```bash
cd /Volumes/IdeaFoundryDev/projects/idea-foundry

# Build optimized production bundle
npm run build

# Test production build locally
npm run preview

# Verify everything works
```

### Step 2: Deploy Frontend to VPS

**Option A: Manual Deployment (Simple)**

**1. Create Web Directory on VPS**
```bash
# SSH to VPS
ssh deploy@your-vps-ip

# Create directory for frontend
sudo mkdir -p /var/www/idea-foundry
sudo chown deploy:deploy /var/www/idea-foundry
```

**2. Copy Build to VPS**
```bash
# From your laptop
cd /Volumes/IdeaFoundryDev/projects/idea-foundry

# Copy dist folder to VPS
rsync -avz --delete dist/ deploy@your-vps-ip:/var/www/idea-foundry/

# Verify
ssh deploy@your-vps-ip
ls /var/www/idea-foundry/
# Should see: index.html, assets/, etc.
```

**3. Configure Nginx for Frontend**
```bash
# On VPS
sudo nano /etc/nginx/sites-available/app
```

```nginx
server {
    listen 80;
    server_name app.yourdomain.com;

    root /var/www/idea-foundry;
    index index.html;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/app /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d app.yourdomain.com
```

**4. Test Production Site**
```bash
# From your laptop
open https://app.yourdomain.com

# Should see your app running!
# Test creating notes, searching, etc.
```

**Congratulations! You're live!**

---

**Option B: Automated Deployment with CI/CD (Professional)**

### Step 3: Set Up GitHub Actions

**1. Create Deploy Key on VPS**
```bash
# SSH to VPS
ssh deploy@your-vps-ip

# Generate SSH key for deployment
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy
# No passphrase (for automation)

# Add to authorized keys
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys

# Copy private key (keep this secure!)
cat ~/.ssh/github_deploy
# Copy output
```

**2. Add Secrets to GitHub**
```bash
# Go to GitHub repository
# Settings → Secrets and variables → Actions → New repository secret

# Add these secrets:
VPS_HOST=your-vps-ip
VPS_USER=deploy
VPS_SSH_KEY=<paste private key from above>
VPS_DEPLOY_PATH=/var/www/idea-foundry
```

**3. Create GitHub Actions Workflow**
```bash
# On your local machine
cd /Volumes/IdeaFoundryDev/projects/idea-foundry

# Create workflow directory
mkdir -p .github/workflows

# Create deploy workflow
nano .github/workflows/deploy.yml
```

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]
  workflow_dispatch:  # Manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build production bundle
        run: npm run build
        env:
          VITE_SUPABASE_URL: https://supabase.yourdomain.com
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          VITE_OLLAMA_URL: https://ollama.yourdomain.com
          VITE_ENVIRONMENT: production

      - name: Deploy to VPS
        uses: appleboy/scp-action@v0.1.4
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: "dist/*"
          target: ${{ secrets.VPS_DEPLOY_PATH }}
          strip_components: 1
          rm: true

      - name: Reload Nginx
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            sudo systemctl reload nginx
            echo "Deployment complete!"
```

**4. Add Supabase Key to GitHub Secrets**
```bash
# GitHub: Settings → Secrets → New secret
# Name: SUPABASE_ANON_KEY
# Value: <your anon key>
```

**5. Commit and Push**
```bash
git add .github/workflows/deploy.yml
git commit -m "Add CI/CD deployment pipeline"
git push origin main

# GitHub Actions will trigger automatically!
# Watch progress: GitHub → Actions tab
```

**6. Deployment is Now Automatic**

Every time you push to `main`:
1. GitHub Actions builds production bundle
2. Deploys to VPS
3. Reloads Nginx
4. App is live in ~2 minutes

**Manual Deployment:**
```bash
# GitHub → Actions → Deploy to VPS → Run workflow
# Triggers deployment without code push
```

### Step 4: Post-Deployment Monitoring

**Set Up Simple Uptime Monitoring:**

**1. Install Uptime Monitor (Optional)**
```bash
# Use free service like:
# - UptimeRobot.com (free tier: 50 monitors)
# - BetterUptime.com (free tier: 10 monitors)

# Or self-hosted on VPS:
ssh deploy@your-vps-ip
# Install uptime-kuma (self-hosted monitoring)
docker run -d --restart=always \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  --name uptime-kuma \
  louislam/uptime-kuma:1
```

**2. Monitor Key Endpoints:**
- `https://app.yourdomain.com` (frontend)
- `https://supabase.yourdomain.com/rest/v1/` (API)
- `https://ollama.yourdomain.com/api/version` (Ollama)

**3. Set Up Alerts:**
- Email/SMS when sites go down
- Slack notifications (if you use Slack)
- Discord webhook (if you use Discord)

**You're now in production with professional CI/CD!**

---

## Phase 5: Graduating from External Drive

### The Transition

Once your app is in production with CI/CD, the **Thunderbolt 5 external drive workflow becomes optional**.

### What Changes

**Before (Development Phase):**
```
External Drive:
└── Code + Docker volumes (essential)

Workflow:
- Move drive between machines
- Run locally
- Manual deployment
```

**After (Production Phase):**
```
GitHub:
└── Code (canonical source)

VPS:
└── Production app + backend

Laptop (Internal SSD):
└── Local clone (optional)

Workflow:
- Code anywhere
- Push to GitHub
- Automatic deployment
- External drive optional
```

### New Workflow (Cloud-Native)

**On ANY Machine:**
```bash
# Clone to internal SSD (don't need external drive)
cd ~/Developer
git clone https://github.com/yourusername/idea-foundry.git
cd idea-foundry

# Install dependencies
npm install

# Configure to point to VPS (same as before)
nano .env.local
# Add VPS URLs

# Optional: Run locally for testing
npm run dev

# Make changes
# ...

# Commit and push
git add .
git commit -m "Add feature"
git push origin main

# GitHub Actions deploys automatically!
# Your app is live in 2 minutes
```

**You Can Now Code From:**
- MacBook (internal SSD)
- Desktop (internal SSD)
- Coffee shop (clone to laptop)
- Friend's computer (clone, edit, push, delete)
- GitHub Codespaces (browser-based)
- iPad with Working Copy app

**No external drive needed!**

### What to Do with External Drive

**Option 1: Archive This Project**
```bash
# Keep as archive/backup
# Useful for: "How did I solve this problem?"
```

**Option 2: Repurpose for Next Project**
```bash
# Start new learning project on same drive
cd /Volumes/IdeaFoundryDev/projects
mkdir next-big-idea
```

**Option 3: Media/Asset Storage**
```bash
# Use for large files
# Videos, design files, datasets
```

**Option 4: Time Machine Backups**
```bash
# Re-enable Time Machine
sudo tmutil removeexclusion /Volumes/IdeaFoundryDev
# Use as backup drive
```

### Celebrating the Milestone

**You've Graduated From:**
- ❌ External drive dependency
- ❌ Manual deployments
- ❌ Single-machine workflow
- ❌ Local-only development

**You've Achieved:**
- ✅ Professional CI/CD pipeline
- ✅ Multi-machine flexibility
- ✅ Production infrastructure expertise
- ✅ Self-hosted backend mastery
- ✅ Cloud-native development workflow
- ✅ DevOps skills that transfer to any project

**This is a major achievement!** Most developers never reach this level of infrastructure competence.

---

## VPS Monitoring & Split Decision

### Why Monitoring Matters

Starting with single VPS (16GB RAM) means you need to **watch for resource contention** between:
- PostgreSQL (database)
- Ollama (AI inference)

**If they compete**, you'll need to **split to 2-VPS architecture**.

### What to Monitor

**1. RAM Usage**
```bash
# SSH to VPS
ssh deploy@your-vps-ip

# Check RAM
free -h

# Total    Used    Free   Shared  Buff/Cache  Available
# 16Gi     12Gi    1.5Gi  256Mi   2.5Gi       3.2Gi

# Watch for:
# - Used > 80% consistently (12.8GB+)
# - Available < 2GB
# - Swap usage (bad sign)
```

**2. CPU Usage**
```bash
# Check CPU
htop

# Watch for:
# - CPU > 70% sustained (not just spikes)
# - Load average > number of cores (8)
# - Ollama processes blocking PostgreSQL
```

**3. Docker Container Stats**
```bash
# Container-specific usage
docker stats --no-stream

# Watch for:
# - postgres container > 6GB RAM
# - ollama container > 10GB RAM
# - Combined usage > 14GB
```

**4. PostgreSQL Performance**
```bash
# Check slow queries
docker exec supabase-db psql -U postgres -c \
  "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Watch for:
# - Query times > 100ms (during normal operations)
# - Sudden spikes during Ollama inference
# - Lock contention
```

**5. Disk I/O**
```bash
# Check disk usage
iotop

# Or simpler:
iostat -x 1

# Watch for:
# - Disk utilization > 80%
# - await times > 10ms
# - Ollama model loading causing I/O spikes
```

### Create Monitoring Dashboard Script

```bash
# On VPS
nano ~/dashboard.sh
```

```bash
#!/bin/bash

while true; do
  clear
  echo "======================================"
  echo "VPS MONITORING DASHBOARD"
  echo "======================================"
  echo ""

  echo "=== MEMORY ==="
  free -h | grep Mem
  echo ""

  echo "=== CPU LOAD ==="
  uptime
  echo ""

  echo "=== DISK USAGE ==="
  df -h / | tail -1
  echo ""

  echo "=== DOCKER CONTAINERS ==="
  docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
  echo ""

  echo "=== TOP PROCESSES ==="
  ps aux --sort=-%mem | head -6
  echo ""

  echo "Press Ctrl+C to exit"
  sleep 5
done
```

```bash
chmod +x ~/dashboard.sh

# Run anytime
./dashboard.sh
```

### Decision Triggers: When to Split

**Split to 2-VPS if you see:**

**Trigger 1: RAM Exhaustion**
```
Symptom: RAM usage consistently > 80% (12.8GB)
Impact: Swap usage, slowdowns, OOM kills
Action: Split Ollama to VPS 2
```

**Trigger 2: Database Slowdown During AI**
```
Symptom: PostgreSQL queries slow from <50ms to >200ms during Ollama inference
Impact: App feels sluggish during embedding generation
Action: Split Ollama to VPS 2
```

**Trigger 3: CPU Contention**
```
Symptom: Load average > 10 sustained, both services fighting for CPU
Impact: Everything slow
Action: Split Ollama to VPS 2
```

**Trigger 4: You Want to Experiment**
```
Symptom: Want to test different LLM models without risking production
Impact: Could break database if model consumes too much RAM
Action: Split Ollama to VPS 2 (isolation)
```

**Trigger 5: Growth**
```
Symptom: User base growing, more concurrent requests
Impact: Need to scale database and AI independently
Action: Split Ollama to VPS 2
```

### How to Split to 2-VPS Architecture

**When you decide to split:**

**Step 1: Provision VPS 2**
```bash
# Order second VPS on Hostinger
# Specs: 16GB RAM, 8 CPU cores (dedicated to Ollama)
# Same datacenter as VPS 1 (minimize latency)
```

**Step 2: Set Up VPS 2 Basics**
```bash
# SSH to new VPS 2
ssh root@vps2-ip

# Same security setup as VPS 1
# Install Docker, configure firewall, etc.
# (Follow Phase 1 steps 1-2)
```

**Step 3: Migrate Ollama to VPS 2**
```bash
# On VPS 2
mkdir -p ~/ollama
cd ~/ollama

# Copy docker-compose.yml from VPS 1
# Start Ollama
docker compose up -d

# Download models
docker exec ollama ollama pull nomic-embed-text
docker exec ollama ollama pull llama3.1:8b
```

**Step 4: Configure Networking**

**Option A: Public Access (simpler)**
```bash
# On VPS 2, set up Nginx + SSL (same as VPS 1)
# Point ollama.yourdomain.com to VPS 2 IP
# SSL certificate via Certbot
```

**Option B: Private Network (more secure)**
```bash
# Check if Hostinger offers private networking
# Connect VPS 1 and VPS 2 on private subnet
# Ollama accessible only from VPS 1
# More secure, no public exposure
```

**Step 5: Update Applications**
```bash
# Update .env files to point to new Ollama location
# If using public:
VITE_OLLAMA_URL=https://ollama.yourdomain.com  # Now on VPS 2

# Redeploy frontend (CI/CD automatically picks up change)
```

**Step 6: Stop Ollama on VPS 1**
```bash
# On VPS 1
cd ~/ollama
docker compose down

# Free up RAM and CPU on VPS 1
# Monitor performance improvement
./monitor.sh
```

**Step 7: Monitor New Setup**
```bash
# VPS 1 (database/frontend)
ssh deploy@vps1-ip
./dashboard.sh

# VPS 2 (Ollama)
ssh deploy@vps2-ip
./dashboard.sh

# Both should show lower resource usage
# Database queries fast again
# Ollama can use full 16GB without impacting DB
```

**You Now Have:**
```
VPS 1 (Core Services - 16GB RAM)
├── Supabase (PostgreSQL, Auth, API, Storage)
├── Frontend applications
├── n8n workflow automation
└── Nginx reverse proxy

VPS 2 (AI/Compute - 16GB RAM)
├── Ollama + LLM models
└── Heavy compute tasks

Cost: ~$80-100/month (2 VPS)
Benefit: No resource contention, independent scaling
```

### Performance Improvement Expectations

**After Split:**
- Database query times: Back to <50ms consistently
- Ollama inference: Faster (full RAM available)
- Can run larger models (13B, 33B parameters)
- Can serve multiple apps from same Ollama instance
- Database never slows due to AI work

**Worth It If:**
- You're hitting resource limits
- App performance matters (users complaining)
- Want to experiment with bigger models
- Planning multiple projects using same infrastructure

**Not Worth It If:**
- Single VPS performance is fine
- Low traffic / personal use
- Budget constrained
- Complexity not justified yet

**You can always split later** - infrastructure is flexible!

---

## Fixing iCloud + Git Issues

### The Problem

**Why iCloud + Git = Disaster:**
- iCloud syncs files individually, not understanding git's atomic operations
- `.git` folder corruption from partial syncs
- Merge conflicts from sync timing issues
- Lock file conflicts (`.git/index.lock`)
- Performance degradation from constant syncing
- Potential data loss

**Never put git repositories in iCloud, Dropbox, or OneDrive.**

### The Solution

#### Step 1: Find All Git Repos in iCloud

```bash
# Search for git repositories in iCloud
find ~/Library/Mobile\ Documents -name ".git" -type d
```

#### Step 2: Move Repositories Out

```bash
# Navigate to iCloud Documents
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/

# Move each project out of iCloud
# If using Thunderbolt 5 external drive:
mv idea-foundry /Volumes/IdeaFoundryDev/projects/

# Or to internal SSD:
mkdir -p ~/Developer
mv idea-foundry ~/Developer/
```

#### Step 3: Verify and Clean Up

```bash
# Check that repo is healthy
cd /Volumes/IdeaFoundryDev/projects/idea-foundry
# Or: cd ~/Developer/idea-foundry

git status
git fsck  # Check for corruption

# If corrupted, re-clone fresh
cd /Volumes/IdeaFoundryDev/projects
rm -rf idea-foundry
git clone https://github.com/yourusername/idea-foundry.git
```

#### Step 4: Prevent Future Issues

**Ensure External Drive is NOT in iCloud Sync Path:**
- Thunderbolt 5 drive mounts to `/Volumes/IdeaFoundryDev`
- This is NOT synced by iCloud (external volumes are safe)

**If Using Internal SSD:**
```bash
# Keep code in ~/Developer (NOT in ~/Documents)

# Good locations (NOT synced by iCloud):
~/Developer/
~/Projects/
~/Code/

# Bad locations (synced by iCloud if enabled):
~/Documents/Developer/
~/Desktop/Code/
~/Library/Mobile Documents/.../
```

**Disable iCloud for Developer Folder:**
```bash
# System Settings → Apple ID → iCloud → iCloud Drive → Options
# Ensure "Desktop & Documents Folders" is OFF
# Or ensure ~/Developer is NOT inside ~/Documents
```

### Prevention Checklist

- ✅ Never put `.git` folders in iCloud/Dropbox/OneDrive
- ✅ Use GitHub/GitLab as your sync mechanism
- ✅ Keep code on external drive or `~/Developer`
- ✅ External drives are safe (not synced by iCloud)
- ✅ Configure `.gitignore` to exclude OS files:

```bash
# Add to .gitignore
.DS_Store
.AppleDouble
.LSOverride
```

**Git is your cloud sync** - trust it, not file sync services.

---

## Performance Benchmarks

### Thunderbolt 5 External SSD Performance

**Test Environment:**
- MacBook Pro M3 Max (or your actual Mac)
- Internal: 2TB NVMe SSD
- External: Thunderbolt 5 NVMe SSD (e.g., OWC Envoy Pro, Samsung X9)

### Expected Performance

**Thunderbolt 5 Specifications:**
- Bandwidth: Up to 120 Gbps (vs TB4: 40 Gbps)
- Read speeds: 3000-6000 MB/s (NVMe SSD)
- Write speeds: 3000-6000 MB/s
- Random I/O: 400,000+ IOPS

**Practical Performance (Development Tasks):**

| Task | Internal SSD | Thunderbolt 5 | Impact |
|------|--------------|---------------|--------|
| Code editing | Instant | Instant | None |
| Git operations | <1s | <1s | None |
| npm install (2000 pkgs) | 20s | 22s | Minimal |
| TypeScript compilation | 3s | 3.2s | Minimal |
| Vite dev server start | 1.5s | 1.6s | Minimal |
| Hot module reload | <100ms | <100ms | None |
| Docker build (cached) | 8s | 9s | Minimal |
| Docker build (fresh) | 45s | 50s | Acceptable |

**Thunderbolt 5 is FAST** - you'll barely notice performance difference for development work.

### Local Development Performance

**When Using VPS Backend:**

| Operation | Performance | Notes |
|-----------|-------------|-------|
| Create note | 200-500ms | Network latency + DB write |
| Search (fuzzy) | <50ms | Client-side, instant |
| Search (semantic) | 500-1500ms | VPS Ollama embed + pgvector search |
| Generate embedding | 1-3s | Depends on VPS CPU, model size |
| Upload file | 1-5s | Depends on file size, bandwidth |
| Load note list | 100-300ms | API call + render |

**Bottleneck is network/VPS**, not external drive.

### VPS Performance Expectations

**Single VPS (16GB RAM, 8 CPU):**

**PostgreSQL:**
- Simple queries: <10ms
- Complex joins: 50-100ms
- Vector similarity search: 100-500ms (depends on dataset size)
- Concurrent queries: Good up to ~50 qps

**Ollama (nomic-embed-text):**
- Embedding generation: 1-3s per note (CPU)
- Batch 100 notes: 2-5 minutes
- GPU would reduce to <1s per note

**Ollama (llama3.1:8b):**
- Tag suggestions: 3-10s per note (CPU)
- Longer with complex prompts
- GPU would reduce to 1-3s

**Network Latency:**
- Same continent: 20-100ms
- Cross-continent: 100-300ms
- Choose datacenter near you!

### When Performance Becomes an Issue

**Indicators:**
- Note creation feels sluggish (>1s)
- Search takes multiple seconds
- Embedding generation times out
- Database queries slow (>200ms)
- VPS CPU/RAM maxed out

**Solutions:**
1. **Optimize queries** (indexes, query structure)
2. **Upgrade VPS** (more CPU/RAM)
3. **Add GPU** (for Ollama, 10x faster)
4. **Split to 2-VPS** (isolate Ollama)
5. **Add caching** (Redis for frequent queries)
6. **Database replication** (read replicas)

Start simple, optimize when needed.

---

## Troubleshooting

### External Drive Issues

**Problem: Drive Not Mounting**
```bash
# Check disk utility
diskutil list

# If listed but not mounted
diskutil mount /dev/disk2  # Replace with your disk

# If not listed, try different cable/port
```

**Problem: Drive Disconnected Unexpectedly**
```bash
# Check git status
cd /Volumes/IdeaFoundryDev/projects/idea-foundry
git fsck

# If issues, restore from GitHub
git fetch origin
git reset --hard origin/main
```

**Problem: Slow Performance**
```bash
# Check if Spotlight indexing is disabled
mdutil -s /Volumes/IdeaFoundryDev
# Should show: "Indexing disabled"

# If enabled, disable
sudo mdutil -i off /Volumes/IdeaFoundryDev

# Check if Time Machine is backing up
sudo tmutil listbackups
# Should NOT show external drive

# If backing up, exclude
sudo tmutil addexclusion /Volumes/IdeaFoundryDev
```

### VPS Issues

**Problem: Can't SSH to VPS**
```bash
# Check if VPS is running (Hostinger panel)
# Check firewall
ssh -v deploy@your-vps-ip
# Verbose mode shows connection issues

# Try root if deploy fails
ssh root@your-vps-ip

# Check SSH service on VPS (via Hostinger console)
sudo systemctl status sshd
```

**Problem: Docker Container Won't Start**
```bash
# SSH to VPS
ssh deploy@your-vps-ip

# Check logs
cd ~/supabase/supabase/docker
docker compose logs

# Common issues:
# - Port already in use
# - Out of memory
# - Missing environment variable

# Restart
docker compose down
docker compose up -d
```

**Problem: Supabase API Not Responding**
```bash
# Check Supabase containers
cd ~/supabase/supabase/docker
docker compose ps

# All should be "Up"
# If any are "Exit" or "Restarting":
docker compose logs <service-name>

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check SSL certificate
sudo certbot certificates
```

**Problem: Ollama Out of Memory**
```bash
# Check VPS RAM
free -h

# If low, restart Ollama
cd ~/ollama
docker compose restart

# Or use smaller model
docker exec ollama ollama pull llama3.1:7b  # Instead of 8b

# Monitor usage
docker stats ollama
```

### Git Issues

**Problem: Merge Conflict**
```bash
# Pull shows conflict
git pull origin main

# See conflicts
git status

# Open conflicted files, resolve
# Look for <<<<<<< HEAD markers

# After resolving
git add .
git commit -m "Resolve merge conflict"
git push origin main
```

**Problem: Accidentally Committed Secrets**
```bash
# If .env file in git (BAD!)
# Remove from history
git rm --cached .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Remove .env from tracking"

# Rotate secrets immediately!
# Generate new keys on VPS
```

**Problem: Lost Uncommitted Changes**
```bash
# Check if changes are stashed
git stash list

# Recover
git stash pop

# If truly lost, check IDE local history
# VS Code: Timeline view
```

### Local Development Issues

**Problem: Frontend Can't Connect to VPS**
```bash
# Check .env.local
cat .env.local

# Verify URLs are correct
# VITE_SUPABASE_URL=https://supabase.yourdomain.com

# Test VPS from terminal
curl https://supabase.yourdomain.com/rest/v1/

# Check browser console (F12)
# Look for CORS errors, network errors

# Check Nginx on VPS
ssh deploy@your-vps-ip
sudo tail -f /var/log/nginx/error.log
```

**Problem: Hot Reload Not Working**
```bash
# Restart dev server
# Ctrl+C, then
npm run dev

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev

# Check file watcher limits (macOS)
ulimit -n
# Should be >1024

# Increase if needed
ulimit -n 10240
```

---

## Quick Reference

### Daily Commands

**Start Development:**
```bash
# Connect external drive
# Navigate to project
cd /Volumes/IdeaFoundryDev/projects/idea-foundry

# Pull latest
git pull origin main

# Start dev server
npm run dev
```

**End Development:**
```bash
# Stop dev server (Ctrl+C)

# Commit changes
git add .
git commit -m "Your message"
git push origin main

# Eject drive
diskutil eject /Volumes/IdeaFoundryDev
```

**Monitor VPS:**
```bash
ssh deploy@your-vps-ip
./dashboard.sh
```

**Deploy to Production:**
```bash
# Automatic via CI/CD
git push origin main

# Manual
npm run build
rsync -avz --delete dist/ deploy@your-vps-ip:/var/www/idea-foundry/
ssh deploy@your-vps-ip 'sudo systemctl reload nginx'
```

### Infrastructure Commands

**Supabase:**
```bash
# Check status
cd ~/supabase/supabase/docker
docker compose ps

# View logs
docker compose logs -f postgres

# Restart
docker compose restart

# Backup database
docker exec supabase-db pg_dumpall -U postgres > backup.sql
```

**Ollama:**
```bash
# Check status
cd ~/ollama
docker compose ps

# View logs
docker compose logs -f

# List models
docker exec ollama ollama list

# Pull new model
docker exec ollama ollama pull llama3.1:8b

# Test generation
docker exec ollama ollama run llama3.1:8b "Test prompt"
```

**Nginx:**
```bash
# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

**SSL Certificates:**
```bash
# List certificates
sudo certbot certificates

# Renew (automatic, but manual if needed)
sudo certbot renew

# Renew specific domain
sudo certbot renew --cert-name supabase.yourdomain.com
```

**Docker:**
```bash
# See all containers
docker ps -a

# Resource usage
docker stats

# Clean up unused
docker system prune -a
```

### Optimization Commands

**External Drive:**
```bash
# Disable Spotlight
sudo mdutil -i off /Volumes/IdeaFoundryDev

# Disable Time Machine
sudo tmutil addexclusion /Volumes/IdeaFoundryDev

# Check status
mdutil -s /Volumes/IdeaFoundryDev
```

**VPS Monitoring:**
```bash
# RAM
free -h

# CPU
htop

# Disk
df -h

# Docker
docker stats --no-stream

# Load average
uptime
```

### Git Workflow

**Feature Development:**
```bash
git checkout -b feature/name
# Make changes
git add .
git commit -m "Message"
git push origin feature/name
# Create PR on GitHub
```

**Fix Merge Conflict:**
```bash
git pull origin main
# Resolve conflicts in files
git add .
git commit -m "Resolve conflict"
git push origin main
```

**Undo Last Commit (Not Pushed):**
```bash
git reset --soft HEAD~1
# Changes still staged, can re-commit
```

### Emergency Procedures

**VPS Down:**
```bash
# Check Hostinger panel
# Restart VPS if needed
# SSH and check services
ssh deploy@your-vps-ip
docker compose -f ~/supabase/supabase/docker/docker-compose.yml ps
docker compose -f ~/ollama/docker-compose.yml ps
```

**Database Corruption:**
```bash
# Restore from backup
cd ~/backups/postgres
gunzip latest_backup.sql.gz
docker exec -i supabase-db psql -U postgres < latest_backup.sql
```

**Lost External Drive:**
```bash
# Clone fresh from GitHub
git clone https://github.com/yourusername/idea-foundry.git

# Configure .env.local
# Continue working
```

---

## Additional Resources

### Learning Resources

**Docker:**
- [Docker Official Documentation](https://docs.docker.com/)
- [Docker Compose Tutorial](https://docs.docker.com/compose/gettingstarted/)

**Supabase:**
- [Supabase Self-Hosting Guide](https://supabase.com/docs/guides/self-hosting)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)

**Ollama:**
- [Ollama Documentation](https://github.com/ollama/ollama/blob/main/README.md)
- [Ollama Model Library](https://ollama.com/library)

**Nginx:**
- [Nginx Beginner's Guide](http://nginx.org/en/docs/beginners_guide.html)
- [DigitalOcean Nginx Tutorials](https://www.digitalocean.com/community/tags/nginx)

**Git:**
- [Pro Git Book](https://git-scm.com/book/en/v2) (free)
- [GitHub Skills](https://skills.github.com/)

**CI/CD:**
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)

**VPS Management:**
- [Linux Journey](https://linuxjourney.com/) (learn Linux)
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials) (applicable to any VPS)

### Tools & Software

**Local Development:**
- [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- [Visual Studio Code](https://code.visualstudio.com/)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

**VPS Monitoring:**
- [Uptime Kuma](https://github.com/louislam/uptime-kuma) (self-hosted)
- [UptimeRobot](https://uptimerobot.com/) (free SaaS)
- [Better Uptime](https://betteruptime.com/) (free tier)

**Performance:**
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) (web performance)
- [Grafana](https://grafana.com/) (advanced monitoring)

---

## Final Thoughts

### You're Building Something Special

**Most developers never:**
- Deploy their own infrastructure
- Understand what happens "below the code"
- Learn DevOps skills until forced to
- Build CI/CD from scratch
- Self-host production services

**You're doing all of this** as part of your learning journey.

### The Path Forward

**Short Term (Next 2-8 weeks):**
- Build VPS infrastructure
- Master Docker orchestration
- Learn Nginx, SSL, backups
- Set up local development workflow

**Medium Term (2-6 months):**
- Develop your app against real backend
- Iterate on features
- Monitor and optimize VPS performance
- Decide if/when to split to 2-VPS

**Long Term (6+ months):**
- Launch production app
- Graduate from external drive
- Cloud-native CI/CD workflow
- Reuse infrastructure for next projects

### Skills You're Gaining

**Technical:**
- Linux administration
- Docker & containerization
- Database management (PostgreSQL)
- Web servers (Nginx)
- SSL/TLS certificates
- CI/CD pipelines
- Git workflows
- AI/ML deployment

**Conceptual:**
- Infrastructure as code
- DevOps philosophy
- Security best practices
- Monitoring & observability
- Disaster recovery
- System design

**These skills are transferable** to any technology job.

### When You Need Help

**Resources:**
- This guide (bookmark it!)
- GitHub Issues (for project-specific)
- Stack Overflow (for technical questions)
- Supabase Discord (for Supabase help)
- Docker Community Forums
- Hostinger Support (for VPS issues)

**Remember:**
- Every expert was once a beginner
- Breaking things is part of learning
- You can always rebuild (backups!)
- The journey is the destination

### Reconfigurability is Key

**Nothing is permanent:**
- Single VPS → Split to 2-VPS (when needed)
- External drive → Cloud-native (when ready)
- Manual deploys → CI/CD (when stable)
- CPU inference → GPU (when budget allows)
- Self-hosted → Managed (if priorities change)

**Stay flexible, learn continuously, iterate often.**

---

**Document Version:** 2.0
**Approach:** Infrastructure-First with Thunderbolt 5 External SSD
**Author:** Claude + John Haugaard
**Project:** Idea Foundry
**Date:** October 24, 2025

**Good luck on your journey!** 🚀
