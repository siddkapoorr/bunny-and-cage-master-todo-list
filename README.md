# Task Tracker

A personal Kanban-style task tracker built with React + Vite, Supabase, and deployed on Vercel.

## Features

- Drag & drop tasks across the board
- 10 status columns: Bank (backlog), Monday–Sunday, Done, Archived
- Customizable task types with color coding
- Persistent login via Supabase Auth
- Per-user data isolation with Row Level Security

## Board Layout

```
[ Bank (full width)                      ]
[ Mon ][ Tue ][ Wed ][ Thu ][ Fri ][ Sat ][ Sun ]
[ Done (full width)                      ]
[ Archived (full width)                  ]
```

---

## Setup

### 1. Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. In the **SQL Editor**, paste and run the contents of `supabase/schema.sql`.
3. In **Authentication → Settings**, make sure Email provider is enabled.
4. Copy your **Project URL** and **anon public key** from **Settings → API**.

### 2. Local development

```bash
# Install dependencies
npm install

# Create your env file
cp .env.example .env
# Then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start dev server
npm run dev
```

### 3. Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in [vercel.com](https://vercel.com).
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon key
4. Deploy. Vercel auto-detects Vite and runs `npm run build`.

---

## Usage

- **Create a task**: Click **+ New Task** in the header, or the **+** button on any column.
- **Edit a task**: Click the ✎ icon on a card.
- **Move a task**: Drag and drop it to any column.
- **Manage types**: Click **Manage Types** in the header to add/edit/delete task types and their colors.
