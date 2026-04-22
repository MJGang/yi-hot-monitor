# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
无需我明确要求，当我需要库或API文档、生成代码、创建项目基架时或配置步骤时，始终使用Context7 MCP。
无需我明确要求，当我需要进行web搜索时，始终使用firecrawl。

## Project Overview

This is an AI Hotspot Monitor tool for AI programming bloggers to automatically discover hotspots, intelligently identify real vs fake content, and receive real-time notifications. The project is planned to have:

- **Frontend**: React + Vite + TailwindCSS with cyberpunk style UI
- **Backend**: Node.js + Express
- **Database**: SQLite + Prisma
- **AI**: OpenRouter API for hotspot validation and content analysis
- **Real-time**: Socket.io for browser push notifications
- **Scheduling**: node-cron for periodic hotspot fetching (every 30 min)

## Commands

### Backend (server/)
```bash
cd server
npm install
npx prisma generate      # Generate Prisma client
npx prisma db push       # Initialize/sync database
npm run dev              # Start dev server (port 3001)
```

### Frontend (client/)
```bash
cd client
npm install
npm run dev              # Start Vite dev server (port 5173)
```

### Database
```bash
cd server
npx prisma studio        # Open Prisma Studio (port 5555) to view/edit data
```

### Optional
```bash
# Run a single test (if tests exist)
npm test -- --run
```

## Architecture

### Data Flow
1. **Keyword Monitoring** → User adds keywords to monitor
2. **Scheduled Fetching** → Every 30 min, scrapes Bing/Twitter for new content
3. **AI Analysis** → OpenRouter analyzes content (relevance 0-100, importance level, summary)
4. **Deduplication** → Avoids notifying for same hotspot
5. **Notification** → Browser push (WebSocket) + optional email (SMTP)

### Key Services
- `services/search/` - Web search crawlers (Bing)
- `services/twitter/` - Twitter API integration (twitterapi.io)
- `services/ai/` - OpenRouter AI analysis
- `services/notify/` - Email and WebSocket notifications
- `jobs/` - Cron jobs for periodic checking

### Database Models (Prisma)
- `Keyword` - Monitored keywords with active status
- `Hotspot` - Collected hotspots with AI analysis results
- `Notification` - Notification history
- `Setting` - Key-value settings

### WebSocket Events
- Server→Client: `hotspot:new`, `hotspot:update`, `notification`
- Client→Server: `subscribe`, `unsubscribe` (keyword rooms)

## Environment Variables

Required in `server/.env`:
- `OPENROUTER_API_KEY` - For AI analysis (required)
- `DATABASE_URL` - SQLite path (default: `file:./dev.db`)

Optional:
- `TWITTER_API_KEY` - Twitter data source
- `SMTP_*` - Email notifications
- `NOTIFY_EMAIL` - Notification recipient

## Documentation

- `docs/README.md` - Project overview
- `docs/LOCAL_SETUP.md` - Step-by-step setup guide
- `docs/REQUIREMENTS.md` - Feature requirements and specs
- `docs/API_INTEGRATION.md` - API integration details and code examples
