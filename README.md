# TrustyDocs

A full-stack document management and invoice generation platform with digital signatures, stamps, multi-company support, and subscription billing.

## Features

- **Document Management** — Create, edit, and track invoices with multiple PDF templates (bold, classic, compact, minimal, modern). Full lifecycle tracking from draft to completion.
- **Digital Signatures & Stamps** — Upload and place signatures and company stamps on documents with precise positioning.
- **Multi-Company Support** — Manage multiple companies with role-based access control (Owner, Admin, Member, Viewer).
- **Contractor Management** — Maintain buyer/seller databases per company with contact info, bank accounts, and translations.
- **PDF & Excel Export** — Generate professional PDFs from templates and export document data to Excel.
- **Subscription Billing** — Paddle-powered subscription plans with feature limits and credit system.
- **Internationalization** — Multi-language support for the UI and invoice labels with currency conversion via NBG (National Bank of Georgia) rates.
- **Audit Logging** — Track all user actions including document views, exports, signatures, and logins.
- **Vehicle Management** — Manage trucks and trailers with default associations for transport documents.
- **Document Templates** — Reusable templates with visibility levels (private, company-wide, user-global).

## Tech Stack

### Backend

- **NestJS 11** — TypeScript framework with modular architecture
- **PostgreSQL 16** — Primary database via Prisma ORM
- **Redis 7** — Caching layer
- **JWT + Google OAuth 2.0** — Authentication with Passport.js
- **AWS S3 / Local Storage** — Configurable file storage
- **Nodemailer** — Email delivery via SMTP
- **Paddle SDK** — Subscription and payment processing

### Frontend

- **React 19** — UI framework with TypeScript
- **Vite 7** — Build tool and dev server
- **React Router v7** — Client-side routing with auth guards
- **Zustand** — Lightweight state management
- **Tailwind CSS 4** — Utility-first styling
- **PDFLib / PDF-ME** — Client-side PDF generation and rendering
- **i18next** — Internationalization
- **Recharts** — Dashboard analytics charts
- **Zod** — Runtime data validation

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── modules/           # Feature modules
│   │   │   ├── auth/          # JWT, Google OAuth, local auth
│   │   │   ├── users/         # User profiles
│   │   │   ├── companies/     # Company CRUD & members
│   │   │   ├── memberships/   # Roles & permissions
│   │   │   ├── documents/     # Document lifecycle & export
│   │   │   ├── contractors/   # Buyer/seller management
│   │   │   ├── signatures/    # Digital signatures
│   │   │   ├── stamps/        # Company stamps
│   │   │   ├── vehicles/      # Truck & trailer management
│   │   │   ├── audit/         # Audit logging
│   │   │   ├── admin/         # Admin dashboard & plans
│   │   │   ├── payments/      # Subscription handling
│   │   │   ├── files/         # File upload & download
│   │   │   └── exchange-rates/# Currency rates
│   │   ├── integrations/      # External services (S3, Mail, Redis, Paddle, NBG)
│   │   ├── common/            # Filters, guards, interceptors
│   │   ├── config/            # Environment configuration
│   │   └── database/          # Prisma setup
│   └── prisma/
│       ├── schema.prisma      # Database schema
│       ├── migrations/        # Migration history
│       └── seed.ts            # Database seeding
├── frontend/
│   ├── src/
│   │   ├── pages/             # Page components by feature
│   │   ├── components/        # Shared & layout components
│   │   ├── api/               # Axios API client
│   │   ├── stores/            # Zustand state stores
│   │   ├── lib/               # Utilities, PDF templates, exports
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript definitions
│   │   └── i18n/              # Translation config
├── docker-compose.yml         # Local dev (PostgreSQL + Redis)
├── docker-compose.prod.yml    # Production stack
├── Caddyfile                  # Caddy reverse proxy with auto-SSL
└── deploy.sh                  # Deployment script
```

## Prerequisites

- **Node.js** (v18+)
- **Docker & Docker Compose** — for PostgreSQL and Redis
- **npm** or **yarn**

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd trastydocs
```

### 2. Start the database and cache

```bash
docker-compose up -d
```

This starts PostgreSQL 16 and Redis 7 containers.

### 3. Set up environment variables

```bash
cp backend/.env.example backend/.env
```

Configure the following in `backend/.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `FRONTEND_URL` | Frontend origin for CORS |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `PADDLE_API_KEY` | Paddle API key |
| `PADDLE_WEBHOOK_SECRET` | Paddle webhook secret |
| `STORAGE_TYPE` | `local` or `s3` |
| `AWS_S3_BUCKET` | S3 bucket name (if using S3) |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Email delivery config |

### 4. Set up the backend

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

The API runs on `http://localhost:3000` by default.

### 5. Set up the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

## API Overview

| Endpoint Group | Description |
|---|---|
| `POST /auth/*` | Login, register, refresh tokens, Google OAuth |
| `GET/PUT /users/*` | User profile management |
| `CRUD /companies/*` | Company management & member invitations |
| `CRUD /documents/*` | Document lifecycle, search, export, signing |
| `CRUD /contractors/*` | Buyer/seller management per company |
| `CRUD /signatures/*` | Signature upload & management |
| `CRUD /stamps/*` | Company stamp management |
| `CRUD /vehicles/*` | Vehicle fleet management |
| `GET /audit/*` | Audit log queries with filters |
| `GET /admin/*` | Admin dashboards & plan management |
| `POST /payments/*` | Subscription & webhook handling |
| `POST /files/*` | File upload & secure download |

## Document Workflow

Documents follow a status lifecycle:

```
DRAFT → PENDING_SIGNATURE → SIGNED → SENT → VIEWED → PAID / COMPLETED → ARCHIVED
```

## Database

The application uses PostgreSQL with Prisma ORM. Key commands:

```bash
npx prisma migrate dev       # Run migrations in development
npx prisma migrate deploy    # Run migrations in production
npx prisma db seed            # Seed initial data
npx prisma studio             # Open database GUI
```

## Deployment

### Production with Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### With Caddy (auto-SSL)

The included `Caddyfile` configures automatic HTTPS with Let's Encrypt. Update the domain and run:

```bash
caddy run
```

### Manual deployment

```bash
chmod +x deploy.sh
./deploy.sh
```

## Security

- **Helmet** — Security headers with CSP
- **CORS** — Strict origin validation in production
- **Rate Limiting** — 60 requests per 60 seconds
- **Password Hashing** — bcrypt with salt rounds
- **JWT Tokens** — Short-lived access tokens (15m) with refresh rotation (7d)
- **Token Blacklisting** — Revocation support for logout
- **Audit Trail** — All actions logged with IP and user agent
- **File Access** — Token-based secure URLs
- **Input Validation** — Class-validator, class-transformer, and Zod

## License

All rights reserved.
