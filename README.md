# Job Application Tracker Demo

A portfolio-safe React and SQLite dashboard for reviewing a synthetic job-search pipeline.

![Desktop dashboard with synthetic job data](docs/screenshots/dashboard-desktop.png)

![Responsive mobile dashboard with synthetic job data](docs/screenshots/dashboard-mobile.png)

## Why this repository exists

The production workflow uses private application history and resume files. This repository was rebuilt with a fresh Git history, fictional companies, `example.com` links and a database generated locally on first run. No real applications, contacts, resumes or credentials are included.

## Features

- Search, country, status, work-mode, difficulty and compatibility filters.
- Column chooser, sorting-friendly table, pagination and bulk selection.
- Detail drawer for status, difficulty and notes.
- Responsive desktop and mobile layouts.
- Node.js HTTP API backed by the built-in SQLite module.
- Deterministic 32-record synthetic seed.
- API tests and GitHub Actions CI.

## Run locally

```bash
corepack enable
pnpm install
pnpm build
pnpm start
```

Open `http://127.0.0.1:4173`. The generated demo database lives in `.data/` and is ignored by Git.

For frontend development:

```bash
pnpm dev
```

## Verify

```bash
pnpm check
```

## Safety boundary

This is a standalone demo, not an export of the private database. The seed generator uses only invented organizations and roles. Database files, environment files and logs are ignored.

## License

MIT
