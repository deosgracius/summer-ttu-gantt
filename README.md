# Summer Timeline — Gantt & Budget Tracker

> **Live:** https://summer-ttu-gantt.fly.dev · passcode‑gated · shared across the team

## What is Summer Timeline?

**Summer Timeline** (technical name **`summer-ttu-gantt`**) is the team's **project‑management cockpit** for building the [**Summer — TTU Campus AI Assistant**](https://github.com/deosgracius/summer-ttu). It is a small, private web app that answers, at a glance, the four questions every project lives or dies by:

- **What** needs to be built (every task, grouped by area),
- **Who** owns it (Deo = backend, Cannon = frontend, or shared),
- **When** it happens and how far along it is (a weekly Gantt schedule with completion % and hours), and
- **What it costs** (a labor + materials + overhead budget, actual vs. estimate).

It is **not** the AI assistant itself — it's the tool that **tracks the work of building it**. Think of it as the project's living dashboard and spreadsheet rolled into one, except shared, real‑time, and pleasant to look at.

### Two names, one thing
- **"Summer Timeline"** — the friendly product name shown on the login screen and in the header.
- **"summer‑ttu‑gantt"** — the technical name: the GitHub repo, the Fly.io app, and the URL.

### Why it exists
A static spreadsheet can't answer "is the whole team on track right now?" without someone manually re‑tallying it, and it can't be safely shared and edited by several people at once. Summer Timeline replaces that with a **single source of truth**: one link, one passcode, always current, that the team and instructors can open any time to see exactly where the project stands.

### Who uses it
The two‑person build team (Deo on backend, Cannon on frontend) to plan and update progress, and instructors / stakeholders to review status, hours, and budget for the summer course deliverables.

---

## The two views

### 1 · Timeline (the Gantt)
The full project plan — **72 tasks across 9 sections** — laid out over the 10‑week schedule (Jun 3 – Aug 11, 2026).

- **Gantt bars** per task across the weeks, **color‑coded by owner** (Deo / Cannon / Shared), each bar showing its **completion %**.
- **Sections** mirror the real architecture: *Setup & Planning · Data & Retrieval (RAG) · Agent & Orchestration · Security & Governance · Integrations & Voice · Kiosk · Admin Dashboard · Testing/Evals/Deployment · Deliverables.*
- A **"NOW" marker** on the current week, and per‑task **estimated vs. logged hours**.
- A **dashboard** up top: overall progress (with a ring), **on‑track vs. behind** against the schedule line, total hours logged/estimated, and a **per‑owner breakdown**.
- **Filter** by owner, **search** tasks, and an **Edit** mode to add / edit / delete tasks, change hours, completion, owners, weeks, and the schedule marker.

### 2 · Budget
The project's cost model, shown as **Actual vs. Estimate** side by side and **auto‑calculated** from editable line items:

- **Direct Labor** (rate × hours, plus a labor‑overhead multiplier) → Total Direct Labor.
- **Contract Labor**, **Direct Materials**, **Equipment Rental** → their subtotals.
- **Business overhead** applied to the combined subtotal → **Total Cost**.
- A **project‑timeline bar** (start → today → end with % elapsed) and two hero figures: spent‑to‑date and total estimate.
- Everything is editable in **Edit** mode; numbers recompute live and save for the whole team.

---

## How it's shared, live, and private
- **Shared & live:** everyone with the passcode opens the same URL and sees the same data; the app **polls every few seconds**, so edits from one person appear for everyone within seconds.
- **Private by construction:** the app reads/writes only through passcode‑checked database functions, and Row‑Level Security blocks any direct access with the public key — so the data is genuinely protected, not just hidden behind the UI.
- **Themes:** clean light + dark (shadcn/ui neutral), with a one‑click toggle and a **Sign out** button.

## The tracker vs. the product (don't confuse them)
| | **Summer — TTU Campus AI Assistant** | **Summer Timeline** (this app) |
|---|---|---|
| What it is | The *product* being built | The *tool that tracks the build* |
| Repo | `summer-ttu` | `summer-ttu-gantt` |
| URL | summer‑ttu.fly.dev | summer‑ttu‑gantt.fly.dev |
| Audience | Campus users + staff | The build team + instructors |

---

## Architecture
- **Frontend:** one self‑contained `index.html` — Geist font, shadcn‑style UI, vanilla JS, no build step.
- **Backend:** [Supabase](https://supabase.com) Postgres. All access flows through `SECURITY DEFINER` RPCs that require the passcode; RLS denies the public key any direct table access. The passcode is stored only as a **bcrypt hash**.
- **Hosting:** static `index.html` served by nginx on [Fly.io](https://fly.io); a GitHub Action auto‑deploys on every push to `main`.

## Run locally
```bash
python -m http.server 5510   # then open http://localhost:5510
```

## Deploy
Push to `main` and the GitHub Action ships it. Manual fallback:
```bash
flyctl deploy --remote-only --ha=false
```

## Security notes
- The Supabase **publishable/anon key** in `index.html` is safe to commit — RLS prevents it from reading or writing data on its own.
- The **passcode is never stored in the file** — change it in‑app via **Settings → Change passcode**.
