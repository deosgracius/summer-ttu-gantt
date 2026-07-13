/**
 * Canonical, pure business logic for Summer Timeline.
 *
 * These are faithful, side-effect-controlled extractions of the algorithms that
 * currently live inline in index.html. They are pure (state is passed in) so they
 * can be unit-tested. STEP 2 (tracked) is to have index.html import from here via
 * thin wrappers, so there is a single source of truth and zero drift.
 */

export const num = x => +x || 0;

/** "Both" is legacy for "Shared"; empty owner defaults to Shared. */
export function ownerCanon(o) { return (o === "Both") ? "Shared" : (o || "Shared"); }

/** Total hours logged on tasks owned by "Shared". */
export function sharedLoggedHours(tasks) {
  return (tasks || []).reduce((s, t) => s + (ownerCanon(t.owner) === "Shared" ? (+t.logged_hours || 0) : 0), 0);
}

/**
 * A member's actual hours = hours logged on their own tasks + an even share of
 * hours logged on Shared tasks (so every logged hour is attributed).
 * Non-members get only their own-task hours.
 */
export function memberLogged(name, tasks, members) {
  const own = (tasks || []).reduce((s, t) => s + (ownerCanon(t.owner) === name ? (+t.logged_hours || 0) : 0), 0);
  const ms = members || [];
  if (!ms.includes(name)) return own;
  return own + (ms.length ? sharedLoggedHours(tasks) / ms.length : 0);
}

export const memberActualHours = memberLogged;

/** Syncs each member labor line's actual hours from the timeline (mutates budget.labor). */
export function syncLaborHours(budget, members, tasks) {
  (budget.labor || []).forEach(l => {
    if ((members || []).includes(l.name)) { l.hrsA = memberLogged(l.name, tasks, members); delete l.manualA; }
  });
}

/** The Software Engineering Lab class is exempt from the equipment-rental fee. */
export function rentalExempt(cfg) {
  return ((cfg && (cfg.class_name || cfg.title)) || "").toLowerCase().includes("software engineering");
}

/** Parse a YYYY-MM-DD string as a LOCAL date (avoids JS's UTC-midnight off-by-one). */
export function pDate(d) {
  if (typeof d === "string") { const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]); }
  return new Date(d);
}

export function projectDays(budget) {
  const s = pDate(budget.start), e = pDate(budget.end);
  if (isNaN(s) || isNaN(e) || e < s) return 1;
  return Math.max(1, Math.round((e - s) / 86400000));
}

/**
 * Full budget computation. Equipment rental (ETRM) counts in BOTH actual and
 * estimate, except for Software Engineering Lab (exempt → 0). Mutates budget.labor
 * via syncLaborHours (same behavior as the app).
 */
export function calcBudget(budget, tasks, cfg, members) {
  syncLaborHours(budget, members, tasks);
  const b = budget, L = b.labor || [], C = b.contract || [], M = b.material || [], R = b.rental || [];
  const DLa = L.reduce((s, r) => s + num(r.rate) * num(r.hrsA), 0), DLe = L.reduce((s, r) => s + num(r.rate) * num(r.hrsE), 0);
  const loh = num(b.laborOhRate), TDLa = DLa * (1 + loh), TDLe = DLe * (1 + loh);
  const TCLa = C.reduce((s, r) => s + num(r.rate) * num(r.hrsA), 0), TCLe = C.reduce((s, r) => s + num(r.rate) * num(r.hrsE), 0);
  const TDMa = M.reduce((s, r) => s + num(r.a), 0), TDMe = M.reduce((s, r) => s + num(r.e), 0);
  const days = projectDays(budget);
  const ETRMexempt = rentalExempt(cfg);
  const ETRMeRaw = R.reduce((s, r) => s + num(r.value) * (num(r.rate) / 100) * days, 0);
  const ETRMe = ETRMexempt ? 0 : ETRMeRaw, ETRMa = ETRMe;
  const subA = TDLa + TCLa + TDMa + ETRMa, subE = TDLe + TCLe + TDMe + ETRMe, boh = num(b.bizOhRate);
  const bizA = subA * boh, bizE = subE * boh;
  return { DLa, DLe, TDLa, TDLe, TCLa, TCLe, TDMa, TDMe, ETRMa, ETRMe, ETRMeRaw, ETRMexempt,
           subA, subE, bizA, bizE, totalA: subA + bizA, totalE: subE + bizE, loh, boh, days };
}

/** Order-independent signature of a loaded payload (for live-sync change detection). */
export function sigOf(d) {
  try {
    return JSON.stringify({ c: d.config, t: (d.tasks || []).slice().sort((a, b) => String(a.id).localeCompare(String(b.id))) });
  } catch (_) { return JSON.stringify(d); }
}

/** Bounded Levenshtein with early-exit (help-assistant typo tolerance). */
export function hpLev(a, b, max) {
  const m = a.length, n = b.length; if (Math.abs(m - n) > max) return max + 1;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i]; let rmin = i;
    for (let j = 1; j <= n; j++) {
      const c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c); cur[j] = v; if (v < rmin) rmin = v;
    }
    if (rmin > max) return max + 1; prev = cur;
  }
  return prev[n];
}

/** Correct an unknown token to the nearest known vocab term (df = known token set). */
export function hpCorrect(tok, vocab, df) {
  if (tok.length < 4 || (df && df[tok])) return tok;
  const max = tok.length > 6 ? 2 : 1; let best = null, bestD = max + 1;
  for (const v of vocab) { if (Math.abs(v.length - tok.length) > max) continue; const d = hpLev(tok, v, max); if (d < bestD) { best = v; bestD = d; if (d === 1) break; } }
  return best || tok;
}

/** Command-palette fuzzy score: substring > subsequence > no match. */
export function cmdkFuzzy(hay, q) {
  hay = hay.toLowerCase(); if (!q) return 1;
  if (hay.includes(q)) return 100 - hay.indexOf(q);
  let i = -1; for (const c of q) { i = hay.indexOf(c, i + 1); if (i < 0) return -1; } return 20;
}
