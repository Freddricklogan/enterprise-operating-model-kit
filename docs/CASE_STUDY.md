# Case Study — Enterprise Operating Model Kit

**Repository:** [enterprise-operating-model-kit](https://github.com/Freddricklogan/enterprise-operating-model-kit) · **Live demo:** [freddricklogan.github.io/enterprise-operating-model-kit](https://freddricklogan.github.io/enterprise-operating-model-kit/) · **Author:** Freddrick Logan

---

## 1. Who has this problem

A leader in the first ninety days of a new enterprise role — a provost, a chief information officer, a city department head — and the consultant helping them see the organisation as it is rather than as the org chart describes it. I have been on the consulting side of that engagement in higher education and the public sector; the leader is handed a capability map, a RACI and objectives, all confident and none checkable.

## 2. The problem, as a scenario

A new provost's first leadership meeting. The capability map on the wall is green where the people who drew it work. The academic-calendar RACI has the provost and the registrar both recommending and nobody deciding, which is why it has not changed in six years. The strategic plan's headline objective — every graduate leaves with a verified record of what they can do — has three divisions claiming to support it and one team objective, about scheduling conflicts, that contributes to nothing. Nobody can say where the strategy is exposed, who decides, or whether the objectives line up, because none of it is computed from anything.

## 3. What it costs to leave it alone

A year of a leader's mandate spent discovering by accident what a diagnostic would show in a week: the capability nobody owns, the decision that stalls because two people think the other decides, the objective that consumed a team's year and served nothing above it. I will not put a figure on that; it is measured in the leader's time and credibility. The nearer cost is that the three documents are trusted because they look finished.

## 4. The approach, and the alternative I rejected

I built the three instruments as data over one model. A capability heat-map scores each capability for importance, current maturity and the target the strategy needs; priority is importance times gap, and a band flags where the strategy leans on something not there. A RACI is generated from decision rights — decide, recommend, input, informed — so it can be checked for exactly one decider and at least one recommender per decision. An OKR cascade is built from parent links and verified: orphans, unsupported enterprise objectives, missing key results and cycles are listed; progress is direction-aware. A ninety-day playbook orders their use.

The alternative I rejected was the consulting deliverable I have produced before: three hand-drawn slides, each defensible, none falsifiable. Storing decision rights and generating the chart is the difference between a RACI that records what people say and one that shows them the decision nobody owns.

## 5. What the code does today

Real: capability scoring, banding and ranking; domain summaries; RACI generation from decision rights with validation and per-role load; the OKR cascade with orphan, unsupported, unmeasured and cycle detection and direction-aware progress; the untrusted-JSON parser; the in-page playbook. All of it is strict-mode TypeScript with unit tests, separated from a rendering layer that builds the page through `textContent` only.

Simulated: the organisation. Roles, capabilities, decisions and objectives describe a regional university as an illustrative sample; the scores are mine, not an assessment of any real institution; the page says so.

Worth knowing: the diagnostics are only as honest as the scores entered, and the tool does not calibrate assessors; it makes a score's consequence visible immediately and makes the RACI and cascade checkable. The maturity scale is a generic one-to-five, not a named model. The playbook lives in the page rather than a separate documentation site — one build, one URL.

## 6. Evidence

Measured in continuous integration and a headless-browser smoke test of the built site: 12 unit tests passing across two files, 100% statement coverage over the pure modules, type-checked ESLint and `tsc --noEmit` clean, HTML validation clean, CodeQL and dependency scanning enabled. Tests pin the band boundaries, the RACI checks (no decider, two deciders, no recommender), clamped direction-aware progress, orphan and cycle detection, and a parser that drops invalid items with warnings. In the browser: zero console errors; the sample shows 13 capabilities with 5 critical gaps, 6 decisions with 1 RACI problem — the academic calendar has no decider — and 1 orphan objective; the tour raises enrollment-forecasting maturity from 2 to 4 and the critical count falls to 4 with the priorities re-ranked; an out-of-range score is refused. No horizontal scroll at 400 pixels.

## 7. What it would take to run this in production

For a single engagement the page is the tool: score in the workshop, export the JSON, print the handout. As a standing instrument it would need the model behind sign-in with history, so the heat-map becomes a trend and the RACI a versioned artefact; owner self-scoring with a second assessor; key-result values fed from the systems that hold them; and an export into the reporting the board already reads. A small service with a database and a few integrations — weeks of engineering; the diagnostics are done and tested.

## 8. Limits and next steps

Single snapshot, no history; a generic maturity scale; no cost attached to closing a gap; no dependencies between capabilities; RACI checked per decision, not for concentration on one person. Next: monthly re-scoring, a per-role concentration check, an effort estimate per gap so the first five moves are also affordable, and a second-assessor mode.

## 9. Who should look at this

**Hiring manager:** evidence that I turn leadership frameworks into checkable instruments and say plainly what a score can and cannot tell you.
**Consulting client:** the diagnostic I would run in your first ninety days — bring your capabilities, decisions and objectives and we can see where the strategy is exposed before the offsite.
**Engineer:** read `src/diagnostics.ts` for the three diagnostics as pure functions; `tests/diagnostics.test.ts` holds the edge cases.
