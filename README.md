# HealthContent — Stage 1 MVP

AI-powered social media content creation for healthcare practices.

## Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Vite + TypeScript | Fast, modern, widely supported |
| UI Components | shadcn/ui + Tailwind CSS | Production-quality, accessible components |
| Routing | Wouter (hash-based) | Lightweight, works in all hosting environments |
| Backend | Express.js + TypeScript | Simple, proven Node.js server |
| Storage | In-memory (MemStorage) | No DB setup needed for Stage 1 |
| AI | OpenAI GPT-4o-mini (abstracted) | Best quality/cost ratio; easy to swap |
| Auth | Session-based (express-session) | Simple, secure, no extra dependencies |

## Project Structure

```
healthcontent/
├── client/
│   ├── index.html                 # Entry HTML (loads fonts)
│   └── src/
│       ├── App.tsx                # Root component + router
│       ├── index.css              # Design system (teal palette)
│       ├── main.tsx               # React entry point
│       ├── components/
│       │   ├── AppShell.tsx       # Sidebar layout used by all pages
│       │   ├── AuthProvider.tsx   # Auth context (login state)
│       │   ├── ThemeProvider.tsx  # Dark/light mode
│       │   └── ui/                # shadcn/ui components
│       ├── pages/
│       │   ├── AuthPage.tsx       # Login + signup
│       │   ├── Dashboard.tsx      # Home screen with stats
│       │   ├── PracticeSetup.tsx  # Practice profile form
│       │   ├── CreateContent.tsx  # AI content generation form
│       │   ├── ContentLibrary.tsx # List of all content items
│       │   ├── ContentDetail.tsx  # Edit, improve, schedule content
│       │   ├── Campaigns.tsx      # Campaign list
│       │   ├── CampaignDetail.tsx # Campaign items
│       │   └── CalendarView.tsx   # Monthly calendar
│       └── lib/
│           └── queryClient.ts     # TanStack Query + fetch wrapper
├── server/
│   ├── index.ts                   # Express server entry
│   ├── routes.ts                  # All API routes
│   ├── storage.ts                 # In-memory data store
│   └── ai.ts                      # AI service (OpenAI abstraction)
└── shared/
    └── schema.ts                  # Data models + TypeScript types
```

## Quick Start (Local)

### 1. Install dependencies

```bash
cd healthcontent
npm install
```

### 2. Set environment variables

Create a `.env` file in the root (or set these in your shell):

```env
# Required for real AI content generation
OPENAI_API_KEY=sk-...your-key-here...

# Optional: custom session secret (defaults to dev value)
SESSION_SECRET=your-random-secret-string
```

> **No API key?** The app still works with built-in mock content for testing.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000).

## How to get an OpenAI API key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up / sign in
3. Go to API Keys → Create new secret key
4. Paste into `OPENAI_API_KEY` in your `.env` file

The app uses `gpt-4o-mini` by default (~$0.60 per million tokens — very cheap).

## Data Storage

Stage 1 uses **in-memory storage** — data resets when the server restarts. This is intentional for rapid development.

To persist data, replace `MemStorage` in `server/storage.ts` with a database (Postgres + Drizzle ORM is already wired into the template). Run `npm run db:push` after configuring `DATABASE_URL`.

## Adding a Real Image Generator (Stage 2)

In `server/ai.ts`, the `imagePrompt` field is already generated and stored. To display actual images:

1. Add a call to OpenAI Images API / Replicate / Stability AI
2. Store the image URL on the `ContentItem`
3. Display it in `ContentDetail.tsx`

## Adding Real Social Media Posting (Stage 2)

In `server/routes.ts`, add a `/api/publish/:id` route that calls the relevant social API (Meta Graph API for Instagram/Facebook, TikTok API). The content item already has all the data you need.
