# Lead Sync Dashboard

This app reads lead/email analytics and Projects Mapper data from Google Sheets workbook exports and protects the dashboard with a stateless signed-cookie login.

## Workbook source

Default hosted source:

- Google Sheets docs URL:
  `https://docs.google.com/spreadsheets/d/1JhbylSA2yPp7aFOHXJGa6o8UvRALVqaurpswNF0yii4/edit?usp=sharing`
- Published web URL:
  `https://docs.google.com/spreadsheets/d/e/2PACX-1vSsd0C65vohb67EndyiMzb3CT4HUt4_4LxQeep3ji3bBywcK6ta43h6W3E2_3X8JWodXDPLX4ABOhlO/pubhtml`

Local development fallback:

- `C:\Users\IKIO\OneDrive - IKIO LED Lighting\CRM\2025-2026 Lead Generation Data.xlsx`

Override it with one of these environment variables before starting the server:

- `WORKBOOK_SOURCE_URL`
  Preferred hosted workbook URL. Supports Google Sheets docs links and published links.
- `GOOGLE_SHEETS_URL`
  Alias for the Google Sheets docs URL.
- `GOOGLE_SHEETS_DOCS_URL`
  Explicit Google Sheets docs URL.
- `GOOGLE_SHEETS_PUBLISHED_URL`
  Explicit Google Sheets published web URL.
- `WORKBOOK_SOURCE_PATH`
  Preferred local workbook path for development.

PowerShell example:

```powershell
$env:WORKBOOK_SOURCE_PATH = "C:\path\to\your\workbook.xlsx"
cmd /c npm run dev
```

Render example:

```text
WORKBOOK_SOURCE_URL=https://docs.google.com/spreadsheets/d/1JhbylSA2yPp7aFOHXJGa6o8UvRALVqaurpswNF0yii4/edit?usp=sharing
```

Notes:

- Hosted deployments should use the Google Sheets URL, not a local `C:\Users\...` OneDrive path.
- Google Sheets docs links are normalized to a direct `.xlsx` export automatically at runtime.
- The published web link is accepted, but the docs URL is the preferred source because it maps cleanly to workbook export.
- The legacy OneDrive and Microsoft Graph fallback code still exists, but Google Sheets is now the primary deployment path.

## Projects source

Default hosted source:

- Google Sheets docs URL:
  `https://docs.google.com/spreadsheets/d/1jYkwEpQ2hXLycm0mlglTVaN-joSlQrvTNUwSSaN6Uqg/edit?usp=sharing`
- Published web URL:
  `https://docs.google.com/spreadsheets/d/e/2PACX-1vTd0kUGt528IBYbHS8-pgCQX2Vge-15bWo9Pb1mjYqNiEN0W2Rym_le1_KyJ65kZCViOXHlQhCFafHt/pubhtml`

Override it with one of these environment variables before starting the server:

- `PROJECTS_SOURCE_URL`
  Preferred hosted Projects workbook URL.
- `SALES_MAPPER_SOURCE_URL`
  Alias for the Projects workbook URL.
- `PROJECTS_GOOGLE_SHEETS_URL`
  Alias for the Google Sheets docs URL.
- `PROJECTS_GOOGLE_SHEETS_DOCS_URL`
  Explicit Google Sheets docs URL.
- `PROJECTS_GOOGLE_SHEETS_PUBLISHED_URL`
  Optional published web URL reference.

Notes:

- Hosted deployments should use the Google Sheets docs URL for Projects.
- The server normalizes the docs URL to a direct `.xlsx` export at runtime.
- The bundled `data/sales-mapper-data.json` file remains only as a fallback seed if the remote Projects sheet is temporarily unavailable.
- ZIP centroids are reused from the bundled mapper payload unless the workbook itself includes latitude/longitude columns.

## Supported sheets

The dashboard dropdown is populated from the workbook tabs. The current workbook includes:

- `2026 Leads`
- `2025 Leads`
- `Email Campaign 2025`

## Authentication

The app uses a stateless signed cookie and protects `/`, `/leads`, and all workbook APIs.

Default local admin account:

- Email: `admin@ikioledlighting.com`
- Password: `LeadSync@123`

Recommended environment variables:

- `SESSION_SECRET`
- `AUTH_BASIC_EMAIL`
- `AUTH_BASIC_NAME`
- `AUTH_BASIC_PASSWORD`
- `AUTH_COMPANY_PASSWORD`
- `AUTH_ALLOWED_DOMAINS`
- `AUTH_ALLOWED_EMAILS`

Behavior:

- The basic user can sign in with `AUTH_BASIC_EMAIL` and `AUTH_BASIC_PASSWORD`.
- Any email ending in a domain from `AUTH_ALLOWED_DOMAINS` can sign in with `AUTH_COMPANY_PASSWORD`.
- Outlook or other external addresses can be allowed explicitly through `AUTH_ALLOWED_EMAILS`.

This build does not include real Microsoft or Google OAuth yet. That still needs provider client IDs, secrets, and redirect URIs.

## Deployment

For Vercel, Railway, Render, or similar hosts, use the Google Sheets docs URLs rather than local workbook paths:

```text
WORKBOOK_SOURCE_URL=https://docs.google.com/spreadsheets/d/1JhbylSA2yPp7aFOHXJGa6o8UvRALVqaurpswNF0yii4/edit?usp=sharing
PROJECTS_SOURCE_URL=https://docs.google.com/spreadsheets/d/1jYkwEpQ2hXLycm0mlglTVaN-joSlQrvTNUwSSaN6Uqg/edit?usp=sharing
SESSION_SECRET=replace-this-in-production
AUTH_BASIC_EMAIL=admin@ikioledlighting.com
AUTH_BASIC_NAME=Admin
AUTH_BASIC_PASSWORD=replace-this-password
AUTH_COMPANY_PASSWORD=replace-this-password
```

This avoids any dependency on a writable filesystem, runtime-generated SQLite files, or in-memory server sessions.
