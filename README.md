# SIRH

A premium HR & payroll platform prototype for Algerian companies — employee records, leave, attendance, payroll with CNAS/IRG calculations, and legal declarations (G50, DAS), wrapped in an animated marketing site and a full back-office.

Built entirely with **Next.js** — no separate backend. Data is seeded and persisted client-side (localStorage), and the "session" is a simple cookie, so the whole thing deploys as a single app on Vercel.

## Stack

- **Next.js 16** (App Router, React 19)
- **Tailwind CSS v4** (design tokens in `globals.css`, no `tailwind.config`)
- **motion** (Framer Motion) for interactions and scroll choreography
- **lucide-react** for icons
- Plain JavaScript (`.jsx` / `.js`), no TypeScript

## What's inside

- **Public site** — animated landing page with an interactive dashboard preview, a live payroll simulator (gross → net with CNAS/IRG breakdown), pricing, and a compliance overview.
- **Back office** (`/app`) — role-based dashboards (admin, HR, manager, accountant, employee), employee directory & org chart, leave & attendance, a payroll run wizard with pre-flight checks, payslips, declarations, recruitment, documents, reports, and settings.
- **Differentiators** — a command palette (⌘K), a rule-based AI assistant over the seeded data, a unified approvals inbox with keyboard shortcuts, and an Algeria-specific compliance calendar.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Visit `/demo` to pick a role and explore the back office — all data is fictional and stored only in your browser.

## Scripts

```bash
npm run dev     # start the dev server
npm run build   # production build
npm run start   # run the production build
npm run lint    # ESLint
```

## Status

Prototype — demo data, no real authentication, no production integrations.
