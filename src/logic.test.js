import { describe, it, expect } from "vitest";
import {
  ownerCanon, sharedLoggedHours, memberLogged, syncLaborHours, rentalExempt,
  pDate, projectDays, calcBudget, sigOf, hpLev, hpCorrect, cmdkFuzzy
} from "./logic.js";

describe("ownerCanon", () => {
  it("maps legacy Both → Shared, empty → Shared, keeps names", () => {
    expect(ownerCanon("Both")).toBe("Shared");
    expect(ownerCanon("")).toBe("Shared");
    expect(ownerCanon(null)).toBe("Shared");
    expect(ownerCanon("Deo")).toBe("Deo");
  });
});

describe("hours attribution", () => {
  const tasks = [
    { owner: "Deo", logged_hours: 10 },
    { owner: "Deo", logged_hours: 5 },
    { owner: "Cannon", logged_hours: 8 },
    { owner: "Shared", logged_hours: 12 },
    { owner: "Both", logged_hours: 4 }, // legacy shared
  ];
  const members = ["Deo", "Cannon"];

  it("sums shared (incl. legacy Both) hours", () => {
    expect(sharedLoggedHours(tasks)).toBe(16); // 12 + 4
  });

  it("member = own + even share of shared", () => {
    // Deo: 15 own + 16/2 = 23 ; Cannon: 8 own + 8 = 16
    expect(memberLogged("Deo", tasks, members)).toBe(23);
    expect(memberLogged("Cannon", tasks, members)).toBe(16);
  });

  it("sum of member actuals equals total logged (nothing lost)", () => {
    const total = tasks.reduce((s, t) => s + t.logged_hours, 0);
    const sum = members.reduce((s, m) => s + memberLogged(m, tasks, members), 0);
    expect(sum).toBeCloseTo(total, 6);
  });

  it("non-members get only own-task hours (no shared share)", () => {
    expect(memberLogged("Guest", tasks, members)).toBe(0);
  });
});

describe("rentalExempt", () => {
  it("only Software Engineering Lab is exempt", () => {
    expect(rentalExempt({ class_name: "Software Engineering Lab" })).toBe(true);
    expect(rentalExempt({ class_name: "FPGA Project Lab" })).toBe(false);
    expect(rentalExempt({ title: "Software Engineering something" })).toBe(true);
    expect(rentalExempt({})).toBe(false);
  });
});

describe("pDate / projectDays (timezone off-by-one guard)", () => {
  it("parses YYYY-MM-DD as the correct LOCAL day", () => {
    const d = pDate("2026-06-22");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);   // June
    expect(d.getDate()).toBe(22);   // not 21
  });
  it("computes inclusive-ish project length in days", () => {
    expect(projectDays({ start: "2026-06-01", end: "2026-08-01" })).toBe(61);
    expect(projectDays({ start: "2026-08-01", end: "2026-06-01" })).toBe(1); // guard: end<start
  });
});

describe("calcBudget", () => {
  const cfgNon = { class_name: "FPGA Project Lab" };
  const cfgSE = { class_name: "Software Engineering Lab" };
  const members = ["Deo", "Cannon"];
  const baseBudget = () => ({
    start: "2026-06-01", end: "2026-08-01", laborOhRate: 1, bizOhRate: 0,
    labor: [{ name: "Deo", rate: 18, hrsE: 100, hrsA: 0 }],
    contract: [], material: [{ a: 50, e: 80 }],
    rental: [{ name: "Scope", value: 2088, rate: 0.2 }],
  });

  it("applies labor overhead (loh) to direct labor", () => {
    const tasks = [{ owner: "Deo", logged_hours: 40 }];
    const c = calcBudget(baseBudget(), tasks, cfgNon, members);
    // DLa = 18 * 40 (synced from timeline) = 720 ; TDL = *(1+1) = 1440
    expect(c.DLa).toBe(720);
    expect(c.TDLa).toBe(1440);
    expect(c.TDLe).toBe(18 * 100 * 2); // 3600
  });

  it("includes ETRM in BOTH actual and estimate for non-exempt classes", () => {
    const c = calcBudget(baseBudget(), [], cfgNon, members);
    // 2088 * 0.002 * 61 days = 254.736
    expect(c.ETRMe).toBeCloseTo(254.736, 3);
    expect(c.ETRMa).toBeCloseTo(254.736, 3);
    expect(c.ETRMexempt).toBe(false);
  });

  it("exempts Software Engineering Lab from ETRM (raw still computed)", () => {
    const c = calcBudget(baseBudget(), [], cfgSE, members);
    expect(c.ETRMexempt).toBe(true);
    expect(c.ETRMe).toBe(0);
    expect(c.ETRMa).toBe(0);
    expect(c.ETRMeRaw).toBeCloseTo(254.736, 3); // still known internally
  });

  it("totals = subtotal + business overhead", () => {
    const b = baseBudget(); b.bizOhRate = 0.55;
    const c = calcBudget(b, [], cfgNon, members);
    expect(c.totalA).toBeCloseTo(c.subA + c.subA * 0.55, 6);
    expect(c.totalE).toBeCloseTo(c.subE * 1.55, 6);
  });

  it("syncs member labor hours from the timeline (single source of truth)", () => {
    const b = baseBudget(); b.labor[0].hrsA = 999; b.labor[0].manualA = true; // stale override
    const tasks = [{ owner: "Deo", logged_hours: 30 }];
    calcBudget(b, tasks, cfgNon, members);
    expect(b.labor[0].hrsA).toBe(30);         // overwritten from timeline
    expect(b.labor[0].manualA).toBeUndefined(); // stale flag cleared
  });
});

describe("sigOf (order-independent change detection)", () => {
  it("is identical when tasks are reordered", () => {
    const a = { config: { x: 1 }, tasks: [{ id: "b" }, { id: "a" }, { id: "c" }] };
    const b = { config: { x: 1 }, tasks: [{ id: "c" }, { id: "a" }, { id: "b" }] };
    expect(sigOf(a)).toBe(sigOf(b));
  });
  it("differs on a real change", () => {
    const a = { config: { x: 1 }, tasks: [{ id: "a" }, { id: "b" }] };
    const b = { config: { x: 2 }, tasks: [{ id: "a" }, { id: "b" }] };
    expect(sigOf(a)).not.toBe(sigOf(b));
  });
});

describe("fuzzy matching", () => {
  it("hpLev computes bounded edit distance", () => {
    expect(hpLev("budget", "budget", 2)).toBe(0);
    expect(hpLev("buget", "budget", 2)).toBe(1);
    expect(hpLev("passcde", "passcode", 2)).toBe(1);
    expect(hpLev("xxxxxx", "budget", 2)).toBe(3); // capped at max+1
  });
  it("hpCorrect maps typos/inflections to nearest vocab", () => {
    const vocab = ["budget", "passcode", "delete", "task", "member"];
    const df = Object.fromEntries(vocab.map(v => [v, 1]));
    expect(hpCorrect("buget", vocab, df)).toBe("budget");
    expect(hpCorrect("passcde", vocab, df)).toBe("passcode");
    expect(hpCorrect("deleted", vocab, df)).toBe("delete");
    expect(hpCorrect("budget", vocab, df)).toBe("budget"); // known → unchanged
    expect(hpCorrect("zzz", vocab, df)).toBe("zzz");       // too short → unchanged
  });
  it("cmdkFuzzy ranks substring > subsequence > miss", () => {
    expect(cmdkFuzzy("Go to Budget", "budget")).toBeGreaterThan(cmdkFuzzy("Go to Budget", "gtb"));
    expect(cmdkFuzzy("Go to Budget", "gtb")).toBe(20);
    expect(cmdkFuzzy("Go to Budget", "xyz")).toBe(-1);
  });
});
