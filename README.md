# KerjainYu

Aplikasi kolaborasi tugas berbasis tim (*project → member → task*) yang dibangun dengan Next.js (frontend) dan Express.js + TypeScript + PostgreSQL (backend).

## Fitur Utama

- **Autentikasi & User**: Registrasi, login, refresh token (rotasi via `httpOnly` cookie), dan manajemen profil.
- **Project & Tim**: Leader membuat project, mengelola link project, serta mengundang atau mengeluarkan member.
- **Manajemen Task & Task Pool**: Pembuatan task yang dapat langsung di-assign atau masuk ke *task pool* untuk diklaim oleh member (*atomic claim*).
- **Submission & Lampiran File**: Pengumpulan hasil kerja berupa teks, link, gambar, atau file menggunakan *presigned URL* ke object storage (S3/MinIO).
- **Review & Appeal (Banding)**: Leader mereview submission (`approve`, `revision`, `reject`), dan member dapat mengajukan banding (*appeal*) jika keberatan dengan hasil review.
- **Task Swap & Kolaborasi**: Pengajuan tukar tugas antar member, komentar pada task, serta notifikasi aktivitas.
- **Dokumentasi API**: Swagger UI otomatis yang di-generate dari schema validasi Zod.

---

## Tech Stack

| Layer | Teknologi |
| --- | --- |
| **Frontend** (`client/`) | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React, `date-fns` |
| **Backend** (`server/`) | Express.js 5, TypeScript, Knex.js, Zod, `@asteasolutions/zod-to-openapi`, `swagger-ui-express`, JWT, `bcrypt` |
| **Database & Cache** | PostgreSQL 16, Redis 7 (`ioredis`, `express-rate-limit`, `rate-limit-redis`) |
| **Object Storage** | MinIO / S3-compatible (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) |
| **Testing & CI** | Vitest, Supertest, GitHub Actions |

---

## Struktur Repository

```text
KerjainYu/
├── .github/workflows/test.yaml   # CI pipeline untuk integration test backend
├── client/                       # Frontend Next.js
│   ├── src/
│   │   ├── app/                  # App Router ((auth), (main), (marketing))
│   │   ├── components/           # UI & feature components
│   │   ├── contexts/             # Session, ProjectTitle, NotificationCount
│   │   ├── lib/                  # API client, hooks, validation, routes
│   │   └── types/                # TypeScript types
│   └── package.json
├── server/                       # Backend Express API
│   ├── scripts/run-tests.js      # Test runner berurutan per file
│   ├── src/
│   │   ├── config/               # Konfigurasi Redis, S3, dll.
│   │   ├── controllers/          # Request/response handler
│   │   ├── database/             # Knex config, migrations, seeds
│   │   ├── docs/                 # OpenAPI/Swagger registry & specs
│   │   ├── middlewares/          # Auth, validate, errorHandler, rate limiter
│   │   ├── routes/               # Express routes (/api/v1/*)
│   │   ├── schemas/              # Zod validation schemas
│   │   ├── services/             # Business logic & authorization helpers
│   │   └── tests/                # Integration tests
│   ├── database.dbml             # Skema database (source of truth)
│   ├── docker-compose.yaml       # PostgreSQL (dev & test), MinIO, Redis
│   ├── README.md                 # Panduan detail setup backend
│   └── package.json
├── agents.MD                     # Konvensi arsitektur & panduan development
└── README.md
```

---

## Prasyarat

- **Node.js** (v20+ / LTS) & **npm**
- **Docker Desktop** (untuk PostgreSQL, Redis, dan MinIO)
- **Git**

---

## Memulai (Development)

### 1. Clone Repository

```bash
git clone https://github.com/CodebyCola/KerjainYu.git
cd KerjainYu
```

### 2. Setup & Jalankan Backend (`server/`)

```bash
cd server
npm install
cp .env.example .env
```

Lengkapi file `server/.env` (lihat `server/.env.example` dan `server/docker-compose.yaml`), termasuk variabel seperti `PORT`, `DATABASE_URL`, `JWT_SECRET`, `ACCESS_TOKEN_SECRET`, `S3_*`, `REDIS_*`, `FRONTEND_URL`, serta variabel Docker (`DB_USER`, `DB_PASSWORD`, `DB_NAME`, `MINIO_USER`, `MINIO_PASSWORD`).

Nyalakan service Docker, jalankan migrasi, lalu jalankan server:

```bash
npm run db:up          # Menyalakan PostgreSQL (5434), MinIO (9000/9001), Redis (6379)
npm run migrate:up     # Menjalankan migrasi database
npm run dev            # Menjalankan server development (tsx watch)
```

Verifikasi server:
- Health check: `GET http://localhost:<PORT>/health`
- Dokumentasi Swagger: `http://localhost:<PORT>/api-docs`

### 3. Setup & Jalankan Frontend (`client/`)

Buka terminal baru:

```bash
cd client
npm install
cp .env.local.example .env.local
```

Sesuaikan `NEXT_PUBLIC_API_URL` di `client/.env.local` agar mengarah ke backend API (contoh: `http://localhost:5000/api/v1`).

Jalankan dev server frontend:

```bash
npm run dev
```

Aplikasi frontend akan berjalan di `http://localhost:3000`.

---

## Testing (Backend)

Integration test menggunakan database PostgreSQL terpisah (`db_test` di port `5433`) bersama Redis dan MinIO.

1. Pastikan `server/.env.test` sudah terisi lengkap (semua variabel environment yang diperlukan aplikasi).
2. Jalankan service test dan migrasi:

```bash
cd server
npm run test:db:up
npm run test:db:migrate
npm test
```

Untuk menghentikan container test:

```bash
npm run test:db:down
```

---

## Daftar Endpoint API (`/api/v1`)

| Prefix | Deskripsi |
| --- | --- |
| `/api/v1/health` | Status kesehatan server |
| `/api/v1/auth` | Registrasi, login, logout, refresh token |
| `/api/v1/users` | Profil & data user |
| `/api/v1/projects` | Manajemen project & membership |
| `/api/v1/links` | Link terkait project |
| `/api/v1/tasks` | Manajemen task, claim task, dan status |
| `/api/v1/invitations` | Undangan project & respons undangan |
| `/api/v1/comments` | Komentar pada task |
| `/api/v1/swap-requests` | Pengajuan & persetujuan tukar tugas |
| `/api/v1/submissions` | Pengumpulan tugas, presigned upload, review & appeal |
| `/api/v1/notifications` | Notifikasi pengguna |

Detail lengkap request, response, dan schema tersedia di `/api-docs` saat server berjalan.

---

## Dokumentasi Terkait

- [Panduan Setup Backend](server/README.md)
- [Skema Database (DBML)](server/database.dbml)
- [Konvensi & Arsitektur Development](agents.MD)
