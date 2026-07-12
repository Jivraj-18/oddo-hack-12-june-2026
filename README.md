# EcoSphere — ESG Management Platform

Full-stack ESG management platform: environmental tracking, social/CSR, governance/compliance, gamification, and reporting, built on a locally-hosted PostgreSQL database.

## Stack

- **Database**: PostgreSQL 16 (Docker for local dev), Prisma ORM, migrations in `server/prisma/migrations`
- **Backend**: Node.js + Express, JWT auth (access + refresh) with bcrypt, Zod validation, Socket.IO for realtime notifications, node-cron for the overdue-compliance job
- **Frontend**: React 18 + Vite + TypeScript, plain CSS with design tokens (no utility-class framework), Recharts, react-router-dom
- **Onboarding**: react-joyride (custom components) — pending
- **Reports**: pdfkit, exceljs, csv-stringify — pending

## Local setup

### Database
```bash
docker run -d --name ecosphere-postgres \
  -e POSTGRES_USER=ecosphere -e POSTGRES_PASSWORD=ecosphere_dev -e POSTGRES_DB=ecosphere \
  -p 5433:5432 -v ecosphere_pgdata:/var/lib/postgresql/data postgres:16
```

### Server
```bash
cd server
cp .env.example .env   # edit if needed
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev             # http://localhost:4000
```

Seeded users (password for all: `Passw0rd!`):
- `admin@ecosphere.dev` — admin
- `manager1@ecosphere.dev` … `manager5@ecosphere.dev` — manager (one per department)
- 14 employee accounts, e.g. `meera.nair@ecosphere.dev`

### Client
```bash
cd client
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

## Module ownership

| Module | Owner |
|---|---|
| Environmental + scoring job | TBD |
| Social + Gamification | TBD |
| Governance + Reports | TBD |
| Frontend design system + tour + dashboard | TBD |

## Business rules implemented so far

- **Auto emission calculation**: toggle in `esg_config`; when on, `POST /erp-operations` requires an emission factor and creates a matching `carbon_transactions` row in the same DB transaction.
- **Overdue compliance flagging**: hourly cron scans `open` issues past `due_date`, flags them, and notifies the owner + all admins (in-app, via Socket.IO).

## Not yet built

Social, Governance, Gamification, Reports, and Settings screens are routed but placeholders (`ModulePage`) pending the module owners' work. Reward redemption, badge auto-award, scoring pipeline job, and report exports are specified in `claude-proposal.md` but not yet implemented.
