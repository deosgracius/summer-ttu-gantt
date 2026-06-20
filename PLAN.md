# Summer — TTU Campus AI Assistant · Execution Plan

**Project:** A production-shaped generative-AI assistant for a university department — grounded multi-retriever RAG + an agentic layer, delivered through two surfaces:
- **Public hallway kiosk** — no login, voice in/out, multilingual, locked to read-only campus tools.
- **Authenticated admin platform** — staff manage data behind RBAC + MFA, with a maker-checker approval queue and audit log.

**Window:** Jun 3 – Aug 11, 2026 (10 weeks). **Tracks:** Deo → Backend · Cannon → Frontend · Shared → planning, integration, deliverables.
**Stack:** FastAPI · SQLAlchemy · Postgres + pgvector / SQLite dev · Neo4j (graph) · Claude/GPT + LangGraph + MCP · React + Vite + TypeScript + shadcn/ui · JWT + TOTP/WebAuthn · Docker on Fly.io.
**Repo:** github.com/deosgracius/summer-ttu · **Live:** summer-ttu.fly.dev (`/kiosk`, `/`).

---

## The integration contract (where the two tracks meet)

1. **Two surfaces, one safety boundary.** Kiosk = public + read-only tool allow-list; admin = authenticated + role-gated. This boundary is designed first and enforced server-side — the frontend never decides access.
2. **API spec drives the frontend.** FastAPI's OpenAPI doc (locked behind auth in prod) is the contract; Cannon builds against it, mocking until endpoints land.
3. **Uniform retrieval interface.** Graph (Neo4j), vector (pgvector + RRF), and document retrieval sit behind one `retrieve()` surface that the agent loop, the orchestrator, and the MCP server all consume.
4. **Tool allow-list = the kiosk's contract.** What the kiosk can call is an explicit server-side list; adding a tool means deciding whether it's kiosk-safe.
5. **One owner per task** — integration happens at the API and the retrieval interface, not in shared files.

---

## Phase 0 — Foundations & infra (Weeks 1–2)
**Shared:** scope ✓, architecture & stack ✓.
**Backend (Deo):** repo + CI/CD ✓, FastAPI skeleton + routers ✓, SQLAlchemy models & schema, **infra: Postgres + pgvector provisioning, Neo4j instance + connection, embeddings provider config**, campus data import (courses, rooms, people).
**Frontend (Cannon):** dev env ✓, React + Vite scaffold, shadcn design system + wireframes.
**Exit:** API skeleton + Swagger reachable, models migrate, pgvector + Neo4j reachable, campus data queryable, frontend shell renders against mocks.

## Phase 1 — Retrieval + agent core + identity (Weeks 3–4)
**Backend:** document ingestion (PDF/text → chunk → embed), vector retrieval (pgvector + cosine + RRF), tool-calling agent loop (Claude/GPT), read-only campus tool registry, JWT auth + RBAC.
**Frontend:** kiosk page layout, agent chat stream + citations, campus search, dashboard shell + nav, login.
**Exit:** ask a campus question on the kiosk → grounded answer with citations, end to end; staff can log in.

## Phase 2 — Orchestration + governance + voice (Weeks 4–5)
**Backend:** LangGraph orchestrator (route → retrieve → generate → validate → iterate), Neo4j graph retrieval (prerequisite traversals), citation/grounding, MFA (TOTP + WebAuthn), kiosk safety allow-list.
**Frontend:** voice in/out UI + language matching, 3D orb / robot + animated background, WebAuthn/MFA flow.
**Exit:** orchestrated multi-retriever answers; kiosk talks and listens; MFA enforced; kiosk provably can't reach edit/email tools.

## Phase 3 — Integrations + admin panels (Weeks 5–7)
**Backend:** MCP server (retrieval re-published as MCP tools), maker-checker approval queue, audit log + rate limiting, email/calendar (Gmail, Google Cal, Outlook/Graph), OAuth connections, request tracing & usage metering.
**Frontend:** admin panels — Approvals, Security, Campus, People, Tasks, Reminders, Connections, Delegation, User Access, Memories, Drafts, Voice Settings — plus notification center + welcome briefing.
**Exit:** staff manage data through panels; sensitive actions route through approvals and land in the audit log.

## Phase 4 — Hardening, evals & deploy (Weeks 6–8)
**Backend:** pytest unit/integration, **RAG eval harness + eval CI**, safety/red-team testing of kiosk gating, Dockerize + Fly.io deploy + health checks, k8s manifests, observability.
**Frontend:** smoke tests, responsive / kiosk-display styling.
**Exit:** test + eval suites green in CI, kiosk survives red-teaming, both surfaces live on a public URL.

## Phase 5 — Polish & deliver (Weeks 9–10)
**Shared:** final bug fixes & polish, Demo Day, Final Report. Presentations + interim report run on cadence throughout.

---

## Sequencing & critical path
- Models + campus import **block** retrieval, which **blocks** the agent loop, which **blocks** kiosk Q&A — this chain is the critical path; protect Weeks 3–4.
- The **kiosk safety allow-list must precede** exposing the kiosk publicly — security before reach.
- Orchestrator and graph retrieval build **after** a single-retriever answer already works end to end.
- Evals run alongside Phase 3–4, not at the end — retrieval quality is regression-tested continuously.
- Deploy early to Fly.io (end of Phase 1) so production deploy in Phase 4 is a repeat, not a first.

## Risk watch
- **Grounding / answer quality** is the core risk → the RAG eval harness is the safety net; treat eval scores as a release gate.
- **Kiosk safety** (a public, unauthenticated LLM surface) → allow-list by construction + red-team testing; never widen kiosk tools without review.
- **Multi-retriever orchestration** is the hardest backend problem → get one retriever solid before fusing three.
- **Voice latency / multilingual** on the kiosk → prototype the speech loop early in Phase 2.
- **Schedule:** the timeline shows the team behind the schedule line — recover in Phases 1–2; defer admin-panel breadth before deferring the kiosk Q&A spine.
