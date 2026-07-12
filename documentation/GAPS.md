# EcoSphere — Gap Analysis vs. Problem Statement

Checked against `docs/EcoSphere ESG Management Platform.pdf` directly (not just `claude-proposal.md`). Backend/API/DB layer matches spec closely; the gaps are almost entirely in the frontend UI not yet surfacing data or workflows the backend already supports.

## Required, not yet done

1. **Notification Settings UI** (Settings → Notification Settings) — §8 explicitly requires this as configurable. Not built at all (backend `esg_config.emailAlerts` exists but no per-notification-type UI).
2. **Manager approval queues** — `PATCH /participations/:id/approve|reject` and the challenge equivalent exist and work, but there's no table/UI for a manager to see pending CSR/Challenge participations and act on them. Only the employee-side "join" flow is built.
3. **Policy acknowledgement reminders** — `policy_reminder` notification type exists in the schema; nothing triggers it (no cron/logic).
4. **Reports filters** — spec (§7) requires Department, Date Range, Module, Employee, Challenge, ESG Category. Only Department + report-type (Module) are wired in the UI; Date Range/Employee/Challenge/ESG Category are missing from `ReportsPage.tsx` (backend schema already accepts `from`/`to`).
5. **Admin creation forms** — no UI to create CSR Activities, Challenges (+ lifecycle transition buttons: Draft→Active→Under Review→Completed, Archive), Audits, Compliance Issues, or Policies. All exist only via seed data / raw API.
6. **Environmental page** — missing "Carbon Transactions" and "Product ESG Profiles" tabs (API endpoints exist: `GET /carbon-transactions`, product profiles seeded; just not surfaced in `EnvironmentalPage.tsx`, which currently only has Goals + Emission Factors tabs).
7. **Social page** — missing "Diversity Dashboard" tab (`GET /diversity-metrics` exists, unused in UI).
8. **Settings** — missing Departments and Categories management UI (`departmentsRouter` CRUD exists; categories have no CRUD endpoints or UI yet).

## Bonus (§9) — status

- Department ESG rankings — **done** (dashboard bar chart, `GET /dashboard/summary` ranking).
- Smart dashboard visualizations — **done** (trend line chart + ranking bar chart via Recharts, real historical `department_scores` data).
- Mobile-responsive interface — **explicitly deprioritized** per instruction.

## Confirmed complete (verified live, not just written)

- DB schema, migrations, seed data — full coverage of spec's data model.
- Auth (JWT + bcrypt + roles).
- Auto emission calculation (toggle-gated, transactional).
- Evidence requirement enforcement (toggle-gated, blocks approval without proof).
- Badge auto-award engine (toggle-gated, idempotent, fires from both CSR and Challenge approval paths).
- Reward redemption (transactional: stock check → decrement → points deduct).
- Compliance issue ownership + overdue flagging (hourly cron, notifies owner + admins).
- Realtime notifications over Socket.IO for all five types: compliance_issue, approval_decision, badge_unlock, issue_overdue (policy_reminder not yet triggered — see gap #3).
- Scoring pipeline (environmental/social/governance/total, hourly cron + manual admin trigger).
- Reports: PDF/Excel/CSV export, all four report types generate real data.
- File upload for evidence (Multer, mimetype/size validated, served back).
- Onboarding tour (react-joyride, custom components, auto-start once per user, persisted).
