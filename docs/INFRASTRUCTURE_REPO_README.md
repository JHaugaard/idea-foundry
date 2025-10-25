# Self-Hosted Development Infrastructure

> A production-ready, self-hosted stack for modern web applications with AI capabilities

**Status**: 🚧 Active Development | **Philosophy**: Infrastructure-First, Learn-By-Doing

---

## Overview

This repository contains everything needed to deploy and maintain a complete self-hosted development and production infrastructure on a VPS. Built as a learning project, it demonstrates professional DevOps practices while providing a reusable foundation for multiple applications.

**What's Inside:**
- Self-hosted Supabase (PostgreSQL, Auth, Storage, Realtime, API)
- Ollama for local LLM inference (embeddings, text generation)
- n8n for workflow automation
- Nginx reverse proxy with SSL/TLS
- Automated backups and monitoring
- Deployment scripts and documentation

**Why Self-Host?**
- **Learning**: Deep understanding of infrastructure, databases, AI deployment
- **Control**: Own your data, customize everything, no vendor lock-in
- **Cost**: Predictable monthly VPS cost vs. usage-based cloud pricing
- **Reusability**: One infrastructure serves multiple projects

---

## Quick Start

### Prerequisites
- VPS with Ubuntu 22.04 LTS (16GB RAM, 8 CPU cores recommended)
- Domain name with DNS access
- SSH access to VPS
- Basic familiarity with command line

### 1. Clone This Repository

```bash
git clone https://github.com/yourusername/infrastructure.git
cd infrastructure
```

### 2. Follow Setup Guides

Read the documentation in order:

1. [VPS Provisioning](docs/01-vps-provisioning.md) - Initial VPS setup, security hardening
2. [Docker Setup](docs/02-docker-setup.md) - Install Docker & Docker Compose
3. [Supabase Deployment](docs/03-supabase-deployment.md) - Self-hosted PostgreSQL + services
4. [Ollama Setup](docs/04-ollama-setup.md) - LLM model deployment
5. [n8n Deployment](docs/05-n8n-deployment.md) - Workflow automation
6. [Nginx & SSL](docs/06-nginx-ssl.md) - Reverse proxy and certificates
7. [Monitoring](docs/07-monitoring.md) - Resource monitoring and alerts
8. [Backups](docs/08-backups.md) - Automated backup strategies

### 3. Deploy Services

```bash
# SSH to your VPS
ssh deploy@your-vps-ip

# Clone this repo on VPS
git clone https://github.com/yourusername/infrastructure.git
cd infrastructure

# Deploy Supabase
cd docker-compose/supabase
cp .env.example .env
nano .env  # Configure your settings
docker compose up -d

# Deploy Ollama
cd ../ollama
docker compose up -d
docker exec ollama ollama pull nomic-embed-text

# Deploy n8n
cd ../n8n
docker compose up -d

# Configure Nginx
cd ../../nginx
sudo cp sites-available/* /etc/nginx/sites-available/
# ... (follow Nginx guide)
```

### 4. Verify Deployment

```bash
# Check all services
docker ps

# Test endpoints
curl https://supabase.yourdomain.com/rest/v1/
curl https://ollama.yourdomain.com/api/version
curl https://n8n.yourdomain.com/
```

---

## Architecture

### Single VPS Architecture (Starting Point)

```
VPS (16GB RAM, 8 CPU cores)
├── Supabase Stack (~6GB RAM)
│   ├── PostgreSQL 15 + pgvector
│   ├── PostgREST (REST API)
│   ├── GoTrue (Authentication)
│   ├── Realtime Server
│   ├── Storage API
│   └── Studio (Admin UI)
│
├── Ollama (~8GB RAM)
│   ├── nomic-embed-text (embeddings)
│   ├── llama3.1:8b (text generation)
│   └── Model storage
│
├── n8n (~512MB RAM)
│   └── Workflow automation
│
└── Nginx (~256MB RAM)
    ├── Reverse proxy
    ├── SSL termination
    └── Static file serving
```

### 2-VPS Architecture (When Scaling)

See [docs/vps-split-guide.md](docs/vps-split-guide.md) for migration instructions.

```
VPS 1: Core Services (8GB RAM)       VPS 2: AI/Compute (16GB RAM)
├── Supabase Stack                   ├── Ollama + Models
├── Application frontends            ├── Heavy compute tasks
├── n8n                              └── AI experimentation
└── Nginx
```

**When to split**: Monitor VPS resources. If RAM >80% or database slows during AI inference, split Ollama to dedicated VPS.

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Database** | PostgreSQL 15 + pgvector | Relational data + vector search |
| **Backend** | Supabase (self-hosted) | BaaS platform (auth, storage, realtime, API) |
| **AI/ML** | Ollama | Local LLM inference (no API costs) |
| **Automation** | n8n | Workflow automation and integrations |
| **Web Server** | Nginx | Reverse proxy, SSL termination, static files |
| **SSL** | Let's Encrypt (Certbot) | Free SSL/TLS certificates |
| **Containerization** | Docker + Docker Compose | Service orchestration |
| **Monitoring** | htop, docker stats, Uptime Kuma (optional) | Resource and uptime monitoring |
| **Backups** | pg_dump, cron, rsync | Automated database and file backups |

---

## Repository Structure

```
infrastructure/
├── README.md                    # This file
├── LICENSE                      # MIT License
│
├── docs/                        # Complete setup documentation
│   ├── 00-complete-guide.md    # Comprehensive Infrastructure-First guide
│   ├── 01-vps-provisioning.md
│   ├── 02-docker-setup.md
│   ├── 03-supabase-deployment.md
│   ├── 04-ollama-setup.md
│   ├── 05-n8n-deployment.md
│   ├── 06-nginx-ssl.md
│   ├── 07-monitoring.md
│   ├── 08-backups.md
│   └── 99-troubleshooting.md
│
├── docker-compose/              # Docker Compose configurations
│   ├── supabase/
│   │   ├── docker-compose.yml
│   │   ├── .env.example
│   │   └── README.md
│   ├── ollama/
│   │   ├── docker-compose.yml
│   │   └── README.md
│   ├── n8n/
│   │   ├── docker-compose.yml
│   │   └── README.md
│   └── full-stack.yml           # Optional: All services in one file
│
├── nginx/                       # Nginx configurations
│   ├── sites-available/
│   │   ├── supabase.conf
│   │   ├── ollama.conf
│   │   ├── n8n.conf
│   │   └── app.conf.template   # Template for new applications
│   ├── ssl/                     # SSL configuration snippets
│   └── README.md
│
├── scripts/                     # Automation scripts
│   ├── provision-vps.sh        # Initial VPS setup
│   ├── backup-postgres.sh      # Database backup
│   ├── backup-all.sh           # Full system backup
│   ├── monitor.sh              # Simple resource monitoring
│   ├── dashboard.sh            # Live monitoring dashboard
│   ├── deploy-app.sh           # Generic app deployment
│   └── README.md
│
├── monitoring/                  # Monitoring configurations
│   ├── uptime-kuma/
│   │   └── docker-compose.yml
│   └── prometheus/             # Future: Advanced monitoring
│
└── .github/
    └── workflows/
        └── deploy-infrastructure.yml  # CI/CD for infrastructure updates
```

---

## Features

### ✅ Production-Ready
- SSL/TLS certificates (Let's Encrypt)
- Automated backups (daily PostgreSQL dumps)
- Security hardening (firewall, fail2ban, SSH hardening)
- Resource monitoring and alerting
- Disaster recovery procedures documented

### ✅ Developer-Friendly
- Hot-reload development (local frontend → VPS backend)
- Environment-based configuration (.env files)
- Detailed documentation for every component
- Troubleshooting guides for common issues
- Scripts for routine operations

### ✅ Cost-Effective
- Single VPS starting cost: ~$40-60/month (Hostinger, Hetzner, DigitalOcean)
- No per-request API costs (Ollama runs locally)
- Predictable monthly expenses
- Scales up when needed (split to 2-VPS: ~$80-100/month)

### ✅ AI-Powered
- Local LLM inference (embeddings, text generation, summarization)
- No OpenAI API dependency (optional fallback)
- Vector similarity search (pgvector)
- Models included: nomic-embed-text, llama3.1:8b, mistral:7b

### ✅ Reusable
- Serves multiple applications from same infrastructure
- Template configs for new apps
- Generic deployment scripts
- Well-documented patterns

---

## Use Cases

### This Infrastructure Supports:

**Web Applications:**
- React/Vue/Svelte frontends
- API-driven applications
- Real-time collaborative apps
- File upload/storage needs

**AI-Powered Apps:**
- Semantic search (document similarity, knowledge bases)
- Text generation (summaries, suggestions, content creation)
- Embeddings generation (note clustering, recommendation engines)
- RAG (Retrieval-Augmented Generation) applications

**Data-Intensive Apps:**
- PostgreSQL for relational data
- pgvector for vector similarity search
- Real-time updates via Supabase Realtime
- File storage via Supabase Storage

**Automation & Workflows:**
- n8n for scheduled tasks, webhooks, integrations
- Automated data pipelines
- Third-party service integrations

---

## Applications Using This Infrastructure

### 1. [Idea Foundry](https://github.com/yourusername/idea-foundry)
Personal knowledge management system with semantic search, AI-powered tagging, and backlink networks.

**Tech**: React, TypeScript, Supabase (auth, database, storage), Ollama (embeddings, tag suggestions)

**Status**: Active Development

### 2. [Your Next Project Here]
...

---

## Learning Path

This infrastructure was built as a learning project following the **Infrastructure-First** approach:

1. **Build Infrastructure First** (2-8 weeks)
   - Provision VPS, deploy services, configure SSL, set up monitoring
   - Learn: Docker, Nginx, PostgreSQL, Linux administration

2. **Develop Locally → VPS Backend** (ongoing)
   - Code on local machine, APIs point to VPS
   - Learn: API integration, environment management, debugging distributed systems

3. **Deploy with CI/CD** (when app is ready)
   - Automate deployment via GitHub Actions
   - Learn: CI/CD pipelines, deployment strategies, zero-downtime deploys

4. **Graduate to Cloud-Native** (production)
   - Professional workflow: git push → auto-deploy
   - Learn: DevOps practices, monitoring, incident response

**Key Philosophy**: Front-load the infrastructure work. Learn DevOps skills while building, not in a panic during launch.

---

## Performance Benchmarks

### VPS Resource Usage (16GB RAM, 8 CPU)

| Service | Idle RAM | Active RAM | CPU (Idle) | CPU (Active) |
|---------|----------|------------|------------|--------------|
| PostgreSQL | 200MB | 2-4GB | 5% | 20-40% |
| Supabase Services | 1GB | 2GB | 2% | 10% |
| Ollama (with models) | 2GB | 8-12GB | 5% | 80-100% |
| n8n | 200MB | 500MB | 2% | 10% |
| Nginx | 50MB | 100MB | 1% | 5% |
| **Total** | **~3.5GB** | **12-18GB** | **15%** | **60-90%** |

### Ollama Inference Performance (CPU)

| Model | Task | Tokens/sec | Latency | GPU Speedup |
|-------|------|-----------|---------|-------------|
| nomic-embed-text | Embedding (1 note) | N/A | 1-3s | ~10x faster |
| llama3.1:8b | Text generation (100 tokens) | 10-20 | 5-10s | ~20x faster |
| mistral:7b | Text generation (100 tokens) | 15-25 | 4-8s | ~15x faster |

### Database Performance

- Simple queries: <10ms
- Complex joins: 50-100ms
- Vector similarity search (1000 vectors): 100-500ms
- Concurrent queries: Good up to ~50 qps

---

## Monitoring & Maintenance

### Daily Monitoring (Automated)

```bash
# SSH to VPS
ssh deploy@your-vps-ip

# Run monitoring dashboard
./infrastructure/scripts/dashboard.sh
```

Watch for:
- RAM usage >80% (consider VPS upgrade or split)
- CPU consistently >70%
- Disk usage >80%
- Docker containers in "Restarting" state

### Weekly Tasks
- Review backup logs (`~/backups/`)
- Check SSL certificate expiry (`sudo certbot certificates`)
- Review nginx access logs for errors

### Monthly Tasks
- Update Docker images (`docker compose pull && docker compose up -d`)
- Review and clean old backups
- Test disaster recovery procedures
- Review and update documentation

---

## Scaling Strategy

### Phase 1: Single VPS (Starting Point)
- **When**: Learning, development, low traffic
- **Cost**: $40-60/month
- **Good for**: Personal projects, prototypes, learning

### Phase 2: Optimized Single VPS
- **When**: Application gains users, performance matters
- **Actions**: Add caching (Redis), optimize queries, add indexes
- **Cost**: Same ($40-60/month)

### Phase 3: 2-VPS Split
- **When**: RAM >80%, database slows during AI inference
- **Actions**: Move Ollama to dedicated VPS
- **Cost**: $80-100/month
- **Benefits**: Isolation, independent scaling, can run larger models

### Phase 4: Multi-VPS + Managed Services
- **When**: Significant user base, revenue generating
- **Actions**:
  - Database → Managed PostgreSQL (automated backups, scaling)
  - Frontend → CDN (Cloudflare, Vercel)
  - Ollama → Keep on VPS or upgrade to GPU instance
- **Cost**: $150-300/month
- **Benefits**: High availability, automatic scaling, reduced maintenance

---

## Cost Breakdown

### Recommended Starting Setup

**VPS (Hostinger, Hetzner, or DigitalOcean):**
- 16GB RAM, 8 CPU cores, 100GB SSD
- **Cost**: $40-60/month

**Domain Name:**
- .com from Namecheap, Google Domains, etc.
- **Cost**: $12/year (~$1/month)

**SSL Certificates:**
- Let's Encrypt (free, auto-renewing)
- **Cost**: $0/month

**Total Monthly Cost**: ~$41-61/month

**What you get:**
- Unlimited API requests (no per-request costs)
- Unlimited users (no per-seat costs)
- Unlimited storage (within VPS disk limits)
- Serves multiple applications

**Compare to Cloud Alternatives:**
- Supabase Pro: $25/month (limited to 8GB database)
- OpenAI API: $0.0001/1k tokens (can add up quickly)
- Vercel Pro: $20/month
- Typical cloud setup: $100-200/month for same capabilities

---

## Security

### Implemented Security Measures

✅ **SSH Hardening**
- Password authentication disabled
- SSH key-only access
- Root login disabled
- Custom SSH port (optional)

✅ **Firewall (UFW)**
- Only ports 22, 80, 443 open
- Drop all other incoming traffic

✅ **Fail2ban**
- Automatic IP banning after failed SSH attempts
- Protection against brute force attacks

✅ **SSL/TLS**
- Let's Encrypt certificates (A+ rating)
- HTTPS-only (HTTP redirects to HTTPS)
- Modern cipher suites

✅ **Docker Security**
- Non-root containers where possible
- Network isolation between services
- Secrets via environment variables (not in images)

✅ **Database Security**
- Strong passwords (generated, not defaults)
- Row Level Security (RLS) in Supabase
- Connection pooling limits
- Automated backups (encrypted)

✅ **Application Security**
- CORS properly configured
- Security headers (X-Frame-Options, CSP, etc.)
- Input validation and sanitization
- Rate limiting (via Nginx)

### Security Checklist

Before going live:
- [ ] All default passwords changed
- [ ] SSH keys rotated
- [ ] Firewall rules verified
- [ ] SSL certificates active and auto-renewing
- [ ] Backups tested (restore procedure validated)
- [ ] Monitoring and alerts configured
- [ ] Security headers verified (securityheaders.com)
- [ ] SSL configuration tested (ssllabs.com)

---

## Contributing

This is a personal learning project, but contributions are welcome!

**How to Contribute:**
1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-improvement`)
3. Make your changes
4. Test thoroughly (provide evidence of testing)
5. Commit with clear messages (`git commit -m 'Add: Prometheus monitoring setup'`)
6. Push to your fork (`git push origin feature/amazing-improvement`)
7. Open a Pull Request

**Areas for Contribution:**
- Additional monitoring solutions (Prometheus, Grafana)
- Alternative deployment methods (Ansible, Terraform)
- Performance optimizations
- Security improvements
- Documentation improvements
- Additional service integrations
- Cost optimization strategies

---

## Roadmap

### ✅ Phase 1: Core Infrastructure (Complete)
- [x] VPS provisioning and hardening
- [x] Docker + Docker Compose setup
- [x] Self-hosted Supabase deployment
- [x] Ollama with LLM models
- [x] n8n workflow automation
- [x] Nginx reverse proxy + SSL
- [x] Basic monitoring and backups
- [x] Complete documentation

### 🚧 Phase 2: Optimization (In Progress)
- [ ] Automated VPS provisioning script
- [ ] Enhanced monitoring (Uptime Kuma)
- [ ] Performance benchmarking tools
- [ ] Migration guide from cloud to self-hosted
- [ ] Video tutorials for setup

### 📋 Phase 3: Advanced Features (Planned)
- [ ] Infrastructure as Code (Terraform)
- [ ] Configuration management (Ansible)
- [ ] Advanced monitoring (Prometheus + Grafana)
- [ ] Log aggregation (Loki or ELK)
- [ ] Database replication and failover
- [ ] GPU support for Ollama (faster inference)
- [ ] Multi-region deployment guide
- [ ] Kubernetes migration path (for massive scale)

### 🔮 Phase 4: Ecosystem (Future)
- [ ] Template repository for new projects
- [ ] CLI tool for common operations
- [ ] Web dashboard for infrastructure management
- [ ] Automated cost analysis and optimization
- [ ] Community showcase of projects using this stack

---

## FAQ

### Q: Why self-host instead of using cloud services?

**A**: Learning, control, cost predictability, and data ownership. This project is about understanding infrastructure deeply, not just consuming it as a service. Plus, for personal projects, $50/month VPS beats $200+/month cloud bills.

### Q: Is this production-ready?

**A**: Yes, with caveats. It's production-ready for personal projects, small teams, and low-to-medium traffic applications. For high-availability requirements or massive scale, you'd want managed services, load balancing, and redundancy.

### Q: How much does this cost to run?

**A**: Starting: ~$40-60/month for VPS. Scaled (2-VPS): ~$80-100/month. Compare to $100-200/month for equivalent cloud services. See [Cost Breakdown](#cost-breakdown) for details.

### Q: What if my VPS goes down?

**A**: You have automated daily backups. Provision a new VPS, run setup scripts, restore from backup. Downtime: 1-4 hours depending on experience. For critical applications, implement high-availability (multiple VPS, load balancer, managed database).

### Q: Can I use this for commercial projects?

**A**: Yes, MIT licensed. But consider your SLA requirements, availability needs, and maintenance capacity. For revenue-generating apps, budget for monitoring, backups, and potentially managed services for critical components.

### Q: How do I migrate from this to managed services later?

**A**: Easy! Supabase offers managed cloud option (import your schema). Ollama can be replaced with OpenAI API. n8n has cloud offering. You're not locked in—this infrastructure teaches you concepts that transfer anywhere.

### Q: Do I need to know DevOps/Linux to use this?

**A**: Basic familiarity helps, but documentation is beginner-friendly with step-by-step commands. If you can use a terminal and follow instructions, you can do this. The goal is to *learn* DevOps through doing.

### Q: What if I get stuck?

**A**: Check [Troubleshooting Guide](docs/99-troubleshooting.md). Still stuck? Open an issue with details (error messages, what you tried, VPS specs). Community help welcomed.

### Q: Can this run on Raspberry Pi / local server?

**A**: Technically yes, but not recommended for production. RAM requirements (16GB) exceed most Pi models. Great for learning on local hardware, but deploy to proper VPS for real applications.

---

## Troubleshooting

See [docs/99-troubleshooting.md](docs/99-troubleshooting.md) for detailed troubleshooting guides.

**Quick Fixes:**

**Service won't start:**
```bash
docker compose logs <service-name>  # Check error messages
docker compose down && docker compose up -d  # Restart
```

**Can't connect to VPS:**
```bash
ssh -v deploy@your-vps-ip  # Verbose connection info
# Check firewall, SSH service status
```

**Out of memory:**
```bash
free -h  # Check RAM usage
docker stats  # Find memory-hungry containers
# Consider VPS upgrade or splitting to 2-VPS
```

**SSL certificate issues:**
```bash
sudo certbot certificates  # Check certificate status
sudo certbot renew --dry-run  # Test renewal
```

---

## Resources

### Official Documentation
- [Supabase Self-Hosting](https://supabase.com/docs/guides/self-hosting)
- [Ollama Documentation](https://github.com/ollama/ollama/blob/main/README.md)
- [n8n Documentation](https://docs.n8n.io/)
- [Docker Documentation](https://docs.docker.com/)
- [Nginx Documentation](http://nginx.org/en/docs/)

### Learning Resources
- [Linux Journey](https://linuxjourney.com/) - Learn Linux fundamentals
- [Docker Curriculum](https://docker-curriculum.com/) - Docker for beginners
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials) - Great VPS guides
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/) - Database deep dive

### Community
- [Supabase Discord](https://discord.supabase.com/)
- [r/selfhosted](https://www.reddit.com/r/selfhosted/) - Self-hosting community
- [r/docker](https://www.reddit.com/r/docker/) - Docker help
- [Stack Overflow](https://stackoverflow.com/) - Technical Q&A

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

**TL;DR**: Use this for anything. Commercial, personal, educational. Modify, distribute, sell. No warranty. Attribution appreciated but not required.

---

## Acknowledgments

Built as a learning project inspired by:
- The self-hosting community ([r/selfhosted](https://www.reddit.com/r/selfhosted/))
- Supabase team for making self-hosting accessible
- Ollama team for democratizing local LLMs
- Infrastructure-First philosophy and best practices from production DevOps

**Special Thanks**:
- Claude (Anthropic) for guidance throughout the learning process
- The open-source community for amazing tools and documentation

---

## Author

**John Haugaard**
- GitHub: [@JHaugaard](https://github.com/JHaugaard)
- Project: Learning DevOps through building

*"The best way to learn infrastructure is to build it yourself."*

---

## Support This Project

If this infrastructure helped you:
- ⭐ Star this repository
- 🐛 Report bugs and issues
- 📖 Improve documentation
- 💡 Share your projects built on this stack
- 🎓 Help others in issues/discussions

**Not accepting donations** - this is a learning project. Pay it forward by helping others learn!

---

**Last Updated**: October 24, 2025
**Status**: Active Development
**Infrastructure Version**: 1.0.0
**Deployed Applications**: 1 (Idea Foundry)

---

<p align="center">
  <strong>Built with curiosity, deployed with confidence</strong><br>
  From zero knowledge to production infrastructure
</p>
