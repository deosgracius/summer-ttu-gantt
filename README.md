# Summer — TTU Campus Assistant · Gantt & Budget Tracker

A private, single‑file web app that tracks the **[Summer — TTU Campus AI Assistant](https://github.com/deosgracius/summer-ttu)** build: a live Gantt timeline (Backend = Deo, Frontend = Cannon) and a cost budget, shared across the team.

**Live:** https://summer-ttu-gantt.fly.dev (passcode‑gated)

## What it does
- **Timeline** — tasks grouped by section/owner, weekly Gantt bars, completion %, hours (estimated + logged), a progress dashboard, and a "now" marker.
- **Budget** — direct/contract labor, materials, equipment, and overhead, auto‑calculated, Actual vs Estimate.
- **Shared & live** — everyone with the passcode sees the same data; edits sync every few seconds.
- **Add / edit / delete** tasks, change hours, retitle, move the schedule marker, change the passcode — all in‑app.
- **Themes** — light + dark (shadcn/ui neutral). Animated "Background Paths" login.

## Architecture
- **Frontend:** one self‑contained `index.html` (Geist font, shadcn‑style UI, vanilla JS).
- **Backend:** [Supabase](https://supabase.com) Postgres. The app reads/writes only through `SECURITY DEFINER` RPCs that require a passcode; Row‑Level Security blocks any direct access with the public key, so the data is genuinely private — not just hidden behind the UI.
- **Hosting:** static, served by nginx on [Fly.io](https://fly.io).

## Run locally
Just open `index.html` in a browser, or serve the folder:
```bash
python -m http.server 5510   # then visit http://localhost:5510
```

## Deploy (Fly.io)
```bash
flyctl deploy --remote-only --ha=false
```
Builds the nginx image from the root `Dockerfile` and ships `index.html` to the `summer-ttu-gantt` app.

## Security notes
- The Supabase **publishable/anon key** in `index.html` is safe to commit — it cannot read or write data on its own (RLS denies it).
- The **passcode is never stored in the file** — only a bcrypt hash lives in the database. Change it in‑app via **Settings → Change passcode**.
