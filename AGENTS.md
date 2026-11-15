# AGENTS.md — KerjainYu Backend

Dokumen ini untuk AI agent (Claude, Copilot, dll) yang membantu development di repo ini. Baca ini dulu sebelum mengerjakan task apa pun — banyak keputusan di sini sengaja dan sudah melalui trial-error, jangan diubah tanpa alasan kuat.

## Apa aplikasi ini

KerjainYu — aplikasi kolaborasi tugas berbasis tim (project → member → task). Leader bikin project, invite member, bikin task (bisa pre-assigned atau masuk task pool untuk diklaim/"war tugas"), member kerjain & submit, leader review (approve/revision/reject), ada sistem swap task antar member, appeal (banding) kalau member keberatan sama hasil review, dan notifikasi. Skema lengkap ada di `database.dbml` di root repo — **selalu baca file itu dulu** sebelum bikin migration/query baru, dan **selalu update file itu** setiap ada perubahan skema.

## Tech Stack

- Express.js + TypeScript
- Knex (query builder) + PostgreSQL 16 (Docker)
- Zod (`@asteasolutions/zod-to-openapi` untuk generate Swagger dari schema yang sama)
- JWT access token (15 menit) + refresh token (7 hari, rotasi) di httpOnly cookie
- Vitest + Supertest untuk integration test
- bcrypt untuk password

## Konvensi Penamaan — WAJIB DIPATUHI

- **Database**: `snake_case` (standar PostgreSQL)
- **Semua kode** (variabel, JSON response, field body request): `camelCase`
- Konversi otomatis lewat `wrapIdentifier`/`postProcessResponse` custom di `src/database/db.ts` (BUKAN pakai `knex-stringcase` — package itu ESM-only dan bentrok sama setup CommonJS project ini)
- **JANGAN hapus** pengecualian `if (value === '*') return origImpl(value)` di `wrapIdentifier` — tanpa itu, `.returning('*')`/`select('*')` akan selalu error karena `snakeCase('*')` menghasilkan string kosong
- **Field yang berasal dari konteks (auth/URL param) TIDAK BOLEH ada di Zod body schema** — contoh: `createdBy`, `projectId`, `userId` (dari `req.user.id`) diambil di service/controller, bukan divalidasi dari body. Kalau ada di body, client bisa memalsukan siapa pembuat/pemilik data.
- Semua schema pakai `.strict()` supaya field asing di body langsung ditolak `400`, bukan diam-diam dibuang.

## Arsitektur per-request

```
route → authenticate (kalau perlu login) → validate(schema, source) → controller → service → repository → db
```

- **Controller**: tipis, cuma jembatan `req`↔`service`↔`res`. Tidak ada logic bisnis di sini.
- **Service**: semua logic bisnis + authorization check (`assertProjectMembership`, `assertProjectLeader`, `assertTaskAccess`, dll — di `services/helper/authorization.helper.ts`). Reuse helper ini, jangan tulis ulang query membership di tiap fungsi.
- **Repository**: query murni, tidak ada logic. Pola `trx?: Knex.Transaction` di tiap fungsi write, `const executor = trx || db`, supaya bisa dipakai di dalam maupun di luar transaction.
- Semua endpoint create/update mengembalikan **1 object** hasil `.returning('*')` yang di-**destructure** (`const [row] = await ...`), bukan array. `.returning('*')` di PostgreSQL selalu balikin array meski 1 row.

## Middleware `validate`

`validate(schema, source)` — `source` default `'body'`, bisa juga `'params'` atau `'query'`. Selalu pasang untuk `:id` di URL (pakai `idParams`/`taskIdParams`/dll) supaya ID non-numerik ditolak `400` dengan jelas, bukan nyasar jadi `404` karena `NaN`.

## Format response — konsisten di semua endpoint

```json
// sukses
{ "success": true, "data": {...} }

// error
{ "success": false, "error": { "code": "...", "message": "...", "httpStatus": ..., "fields": {...} } }
```

`error.code` dipakai FE untuk logic (switch-case), bukan `error.message` (message bisa berubah teksnya kapan saja). `fields` (opsional) untuk mapping error per field form.

## Status code

- `200` GET/PATCH/POST aksi (login, logout, refresh, claim, dll)
- `201` POST yang membuat resource baru (register, createProject, createTask, dll)
- `400` validation error
- `401` belum login / token invalid
- `403` login tapi tidak berhak (bukan member/leader/pemilik resource)
- `404` resource tidak ada
- `409` conflict (duplicate, state tidak sesuai, dll)

## Authorization pattern

- `assertProjectMembership(projectId, userId)` — user harus jadi member aktif. Throw `NotFoundError` kalau project tidak ada, `ForbiddenError` kalau bukan member.
- `assertProjectLeader(projectId, userId)` — dibangun DI ATAS `assertProjectMembership`, tambah cek `role === 'leader'`.
- `assertTaskAccess(taskId, userId)` — cek task ada + user adalah member project task itu. WAJIB dipanggil di SETIAP service yang terkait task (termasuk nested resource seperti comments), jangan asumsikan "sudah dicek di endpoint lain" — tiap request HTTP itu independen, tidak ada state yang nyambung antar request.
- Endpoint respond-invitation punya otorisasi BEDA (bukan leader, tapi pemilik row invitation itu sendiri — `membership.userId === req.user.id`).
- Endpoint cancel swap request otorisasinya `requestedBy`; approve/reject otorisasinya `requestedTo` (kalau `project.allowFreeSwap`) atau leader (kalau tidak).

## Soft delete, bukan hard delete

Pola konsisten di seluruh app: **jangan pernah `DELETE` row**, ubah status:

- `projects.is_archived` (bukan hapus project)
- `project_members.status`: `invited → active/rejected`, atau `→ removed` (leave/kick)
- `task_swap_requests.status`: `pending → approved/rejected/cancelled`

Alasan: audit trail, dan foreign key lain (task assignee, dll) tetap valid karena semua FK menunjuk ke `users.id`, bukan ke row status-managed itu.

## Atomic update untuk aksi yang rawan race condition

`claimTask` dan aksi serupa (siapa cepat dia dapat) WAJIB pakai atomic update, bukan SELECT-lalu-UPDATE terpisah:

```ts
const [claimed] = await db("tasks")
  .where({ id: taskId, status: "unclaimed" }) // syarat DI DALAM where, bukan di-cek dulu terpisah
  .update({ assigneeId: userId, status: "todo" })
  .returning("*");
if (!claimed) throw new ConflictError("...");
```

## File upload — presigned URL, BUKAN base64/lewat backend

Object storage (S3/R2/GCS), backend tidak pernah menerima file secara langsung untuk file besar:

1. `POST` request presigned URL (endpoint terpisah, sebelum upload)
2. Client upload langsung ke object storage pakai presigned URL itu
3. `POST` confirm — endpoint TERPISAH LAGI, setelah upload selesai, baru simpan reference ke DB

Ini WAJIB 2+ endpoint terpisah, tidak bisa digabung 1 fungsi — ada jeda waktu upload sungguhan di antara langkah 1 dan 3 yang backend tidak ikut campur.

**Delete/replace file** kebalikannya — backend yang eksekusi langsung ke object storage (bukan presigned URL ke client), karena butuh authorization check dan audit trail yang lebih ketat (operasi destruktif).

`submission_attachments.content` dipakai untuk type `text`/`link`. Type `image`/`file` pakai `object_key` + `file_name` + `mime_type` + `file_size` (kolom baru, lihat `database.dbml`).

## Testing

- `npm run test` menjalankan `scripts/run-tests.js` — **BUKAN** `vitest run` langsung. Ini workaround untuk bug Vitest v4 (`pool: forks`/`threads` tidak sepenuhnya menghormati `fileParallelism` di beberapa environment — lihat github.com/vitest-dev/vitest/issues/8861). Tiap file test dijalankan sebagai proses terpisah, berurutan. **Kalau nambah file test baru, tambahkan ke array `testFiles` di `scripts/run-tests.js`.**
- Database test terpisah dari development (`kerjainyu_test_db`, port 5433). `db.ts` otomatis pilih `.env` vs `.env.test` berdasarkan `NODE_ENV`.
- `.env.test` HARUS berisi SEMUA variable yang ada di `.env` (bukan cuma `DATABASE_URL`) — pernah kejadian `ACCESS_TOKEN_SECRET` lupa disalin, bikin test login selalu 500.
- Pola test: `beforeEach(cleanDatabase)` per describe block, `afterAll(closeDb)` SEKALI di level file (bukan di dalam describe — pernah bikin bug database connection ketutup sebelum describe lain selesai).
- Gunakan `registerAndLogin(username?)` dari `tests/helpers/auth.ts` — kalau `username` tidak diisi, generate random (hindari hardcode username sama di banyak file test, pernah menyebabkan race condition/duplicate key).
- Rate limiter (`authLimiter`, dll) di-bypass otomatis saat `NODE_ENV=test`.

## Migration

- File migration WAJIB `.js` (CommonJS), BUKAN `.ts` — Knex CLI di Windows sering gagal load `ts-node`. Tapi kode aplikasi (service/controller/dll) tetap full TypeScript.
- Nambah value baru ke enum PostgreSQL (yang diimplementasikan sebagai CHECK constraint oleh Knex `enu()`) butuh raw query `DROP CONSTRAINT` + `ADD CONSTRAINT`, bukan sekadar edit array di migration lama.
- Kalau migration BELUM pernah dijalankan di tempat lain (masih solo development): boleh edit langsung migration lama + `db:reset`. Kalau SUDAH pernah jalan/di-share: WAJIB migration baru (`alterTable`), jangan edit yang lama.

## Gotcha yang sudah pernah terjadi — jangan diulang

- Nama tabel `projects`/`project_members` (JAMAK), bukan `project`/`project_member` — beberapa kali salah ketik di query dan bikin error "relation does not exist".
- `.returning('*')` / `.returning(...)` hanya valid untuk insert/update/delete, TIDAK valid untuk `SELECT` biasa.
- `.where(id)` (angka mentah) di Knex itu salah — harus `.where({ id })` atau `.where('id', id)`.
- Jangan lupa `return` di dalam `.then()` callback — arrow function dengan `{ }` butuh `return` eksplisit.
- Enum value harus konsisten di migration, Zod schema, DAN kode yang insert — pernah ada mismatch `"swap"` vs `"swapped"`.

## Dokumentasi API (Swagger)

`src/docs/*.docs.ts`, di-generate dari Zod schema yang sama (`@asteasolutions/zod-to-openapi`) supaya tidak ada duplikasi/drift antara validasi dan dokumentasi. **Setiap file docs baru WAJIB di-`import` di `src/docs/registry.ts`** (side-effect import, tidak ada named export yang dipakai) — kalau lupa, `registerPath()` di file itu tidak pernah terpanggil dan endpoint-nya tidak muncul di `/api-docs`, meskipun kodenya sendiri terlihat benar.

## File referensi lain di repo ini

- `database.dbml` — skema lengkap, source of truth struktur data. Dipublish lewat dbdocs (`dbdocs build database.dbml` dari folder `server/`).
- `NAMING_MAPPING.md` — detail konvensi snake_case↔camelCase.
- `README.md` — setup development, troubleshooting error yang sudah pernah terjadi.
