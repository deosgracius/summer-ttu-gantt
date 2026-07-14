# Summer Timeline — multi-tenant Gantt & Budget tracker

> **Live:** https://summer-ttu-gantt.ece26.workers.dev · passcode-gated · $0/month

A web app that lets **student project-lab groups at Texas Tech** plan and track a
semester project in one place: a weekly **Gantt timeline** and an auto-calculated
**budget**. It's **multi-tenant** — many groups use the same deployment, but each
signs in with its own passcode and sees only its own workspace. An **admin** passcode
provides cross-group oversight.

It was born tracking one project (the *Summer — TTU Campus AI Assistant*) and grew
into a platform any lab group can register into.

---

## Features

- **Timeline (Gantt):** tasks in editable sections across the class schedule, two views
  (Detailed bars + Progress status grid), drag-to-reorder (FLIP), a live "NOW" marker,
  per-week hour logging.
- **Budget:** auto-calculated cost model — direct labor (+overhead), contract labor,
  materials, equipment rental (ETRM), business overhead — Actual vs Estimate. Actual
  hours are driven by the timeline (single source of truth).
- **Multi-tenancy:** self-service registration (class / semester / project / section /
  group / dates / members); per-group isolation by passcode.
- **Admin console:** view every group, add/remove members, reset passcodes, suspend or
  delete groups, budget limits, registration code, audit log (with IPs), full JSON
  backup, end-of-semester auto-cleanup.
- **Live collaboration:** realtime broadcast sync with a resilient polling fallback
  (pauses on hidden tab, backs off on error).
- **Polish:** monochrome + single-accent design, entrance/motion choreography, ⌘K
  command palette, clickable dashboard summaries, an offline (no-LLM) help assistant.
- **Accessible-minded:** keyboard nav, ARIA live regions, reduced-motion support,
  light/dark themes. *(Not yet audited with a screen reader — see Limitations.)*

---

## Architecture

| Layer | Choice |
|-------|--------|
| **Frontend** | One self-contained `index.html` — vanilla JS, Geist font, design-token CSS. No build step. |
| **Backend** | Supabase (PostgreSQL). |
| **Hosting** | Cloudflare Workers static assets. Auto-deploys on every `git push` to `main`. |
| **Tests/CI** | Vitest over `src/logic.js`; GitHub Actions runs them on push/PR. |

### Security model — the "gateway" pattern
Row-Level Security is **enabled with no table policies**, so the public anon key can
**never** read or write tables directly. All access flows through passcode-checked
`SECURITY DEFINER` database functions. Additional controls:

- **Admin passcode:** bcrypt-hashed.
- **Group passcodes:** indexed SHA-256 (for O(1) login lookup).
- **Rate limiting:** per-IP throttle/lockout on `login` and `gantt_load`.
- **Optimistic concurrency:** stale task saves are rejected.
- **Auditing:** every admin action + admin login recorded with client IP.
- **Backups:** daily `pg_cron` snapshot (kept 14); admin can restore/download.

---

## Local development

```bash
# serve the app
python -m http.server 5510      # → http://localhost:5510

# run the test suite
npm install
npm test                        # vitest, watch mode: npm run test:watch
```

### Project layout
```
index.html            # the entire app (HTML + CSS + JS)
src/logic.js          # pure, canonical business logic (budget math, hours, matching)
src/logic.test.js     # Vitest unit tests
.github/workflows/    # test.yml — runs the suite on push/PR
.assetsignore         # keeps non-app files off the public Cloudflare deploy
```

> `src/logic.js` is the tested source of truth for the core algorithms. `index.html`
> still contains inline copies of some of them — unifying the two (importing from the
> module) is the next refactor.

## Deployment
Push to `main`; Cloudflare rebuilds and serves the new `index.html` in ~30s.
Rollback is available in the Cloudflare dashboard (Workers & Pages → Deployments).
Database/RPC changes are applied directly in Supabase.

---

## Known limitations (honest roadmap)
This is a strong prototype, not yet production-hardened. Deliberately tracked gaps:

- **Single-file, no framework/TypeScript** — capped maintainability; a Vite/TS
  migration is planned.
- **Shared-passcode auth** — no per-user accounts; credential sharing is inherent.
  Group passcodes are fast (unsalted) SHA-256.
- **Rate limiting is per-IP** — bypassable via proxies; can affect shared campus NATs.
  No CAPTCHA yet.
- **Backups live in the same database** — not off-site disaster recovery.
- **No E2E tests** and **no external error/uptime monitoring** yet.
- **Accessibility claims are unaudited** by a real screen reader / axe.

## Security notes
- The Supabase **anon key** in `index.html` is safe to commit — RLS + the RPC gateway
  prevent it from touching data on its own.
- Passcodes are **never** stored in the repo. Change the admin passcode in-app via
  **Admin Console → ⚙ Manage → 🔐 Admin passcode**; group passcodes via **Settings**.
