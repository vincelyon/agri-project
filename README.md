# Agri-Input Stock Manager

Plain setup and run guide for the mini inventory web application.

---

## 1. Requirements

Install these before you start:

| Requirement | Version | Notes |
| --- | --- | --- |
| Node.js | 20 or newer | Includes `npm` |
| PostgreSQL | 14 or newer | Server binaries must be available (`pg_ctl`, `initdb`, `createdb`) |

Optional:

- A web browser (Chrome, Firefox, Edge, or similar)
- `openssl` (to generate a session secret)

Check versions:

```bash
node -v
npm -v
psql --version
```

If `psql` or `pg_ctl` is not found on Debian/Ubuntu, install PostgreSQL first, for example:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

---

## 2. Open the project folder

Open a terminal and go to the project folder:

```bash
cd "/path/to/project"
```

---

## 3. Install Node dependencies

From the project root:

```bash
npm install
```

Wait until the install finishes without errors.

---

## 4. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env
```

Open `.env` in a text editor and set at least these values.

### Required variables

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | See options below |
| `SESSION_SECRET` | Signs login session cookies | Long random string |
| `SEED_ADMIN_EMAIL` | Email for the first admin user | `admin@example.com` |
| `SEED_ADMIN_PASSWORD` | Password for the first admin user | `ChangeMe123!` |
| `SEED_ADMIN_NAME` | Display name for the first admin | `Shop Administrator` |

### Optional variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `SEED_DEMO_DATA` | Load sample products when seeding | `false` |
| `TEST_DATABASE_URL` | Separate database for automated tests | only needed for tests |

Generate a session secret:

```bash
openssl rand -base64 32
```

Paste the output into `SESSION_SECRET` in `.env`.

---

## 5. Start PostgreSQL

You can use either a local private database (recommended for development) or your own PostgreSQL server.

### Option A — Local private database (recommended)

This creates a private cluster in `./.pgdata` on port `54329` and creates the `agri_stock` database. No sudo is required if PostgreSQL binaries are already installed.

```bash
npm run db:local -- start
```

Then set this in `.env`:

```
DATABASE_URL="postgresql://agri@127.0.0.1:54329/agri_stock?schema=public"
```

Useful commands:

```bash
npm run db:local -- status
npm run db:local -- stop
```

### Option B — Your own PostgreSQL server

1. Create a database named `agri_stock` (or another name you prefer).
2. Create a database user that can connect to it.
3. Set `DATABASE_URL` in `.env`, for example:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/agri_stock?schema=public"
```

Replace `USER` and `PASSWORD` with your real credentials.

---

## 6. Apply the database schema

From the project root, with PostgreSQL running and `DATABASE_URL` set:

```bash
npm run db:deploy
```

This applies the Prisma migrations and creates the tables.

During active development you may instead use:

```bash
npm run db:migrate
```

---

## 7. Create the administrator account

Seed the first administrator (and optional demo data):

```bash
npm run db:seed
```

Notes:

- The admin account uses `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from `.env`.
- On first sign-in the app forces a password change.
- If `SEED_DEMO_DATA="true"`, sample categories and products are also created.
- Seeding does not overwrite an existing admin with the same email.

---

## 8. Run the application (development)

Start the development server:

```bash
npm run dev
```

Open a browser and go to:

```
http://localhost:3000
```

Sign in with the seeded administrator email and password.

After login you must set a new password when prompted.

---

## 9. Run the application (production-style)

Build the app:

```bash
npm run build
```

Apply migrations on the target database (if not already applied):

```bash
npm run db:deploy
```

Start the server:

```bash
npm start
```

The app listens on port 3000 by default (`http://localhost:3000`).

For a real deployment:

1. Use a strong unique `SESSION_SECRET`.
2. Serve the app over HTTPS (session cookies are marked Secure in production).
3. Do not expose `DATABASE_URL` or other secrets with a `NEXT_PUBLIC_` prefix.
4. Keep PostgreSQL reachable only from the application host where possible.

---

## 10. First use after login

Typical order of work in the app:

1. Sign in as administrator.
2. Change the temporary password when asked.
3. Open **Settings** and set shop name, currency, and preferred units if needed.
4. Open **Categories** and add product categories.
5. Open **Products** and add products (with reorder levels).
6. Open **Stock in** to record goods received.
7. Open **Stock out** to record issues or sales.
8. Use **Inventory** and **Dashboard** to check balances and low-stock alerts.
9. Open **Users** to create inventory attendant accounts (a one-time temporary password is shown).

---

## 11. Common npm scripts

| Command | What it does |
| --- | --- |
| `npm install` | Install Node packages |
| `npm run db:local -- start` | Start local private PostgreSQL |
| `npm run db:local -- stop` | Stop local private PostgreSQL |
| `npm run db:local -- status` | Show local PostgreSQL status |
| `npm run db:deploy` | Apply database migrations |
| `npm run db:migrate` | Create/apply migrations during development |
| `npm run db:seed` | Create admin (and optional demo data) |
| `npm run db:reset` | Reset the database (destructive) |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run automated tests |

---

## 12. Automated tests (optional)

Integration tests need a separate database whose name contains `test`.

If you use the local private cluster, it already creates `agri_stock_test`. Set:

```
TEST_DATABASE_URL="postgresql://agri@127.0.0.1:54329/agri_stock_test?schema=public"
```

Then run:

```bash
npm test
```

Or separately:

```bash
npm run test:unit
npm run test:integration
```

For the HTTP smoke test, start the app first (`npm run dev`), then in another terminal:

```bash
npm run test:e2e
```

---

## 13. Troubleshooting

### `PostgreSQL binaries not found`

Install PostgreSQL and ensure `pg_ctl` is on your PATH, then retry `npm run db:local -- start`.

### Cannot connect to the database

1. Confirm PostgreSQL is running (`npm run db:local -- status` or your service manager).
2. Confirm `DATABASE_URL` in `.env` matches host, port, user, and database name.
3. Run `npm run db:deploy` again after the database is reachable.

### Login fails after seeding

1. Confirm you used the email and password from `.env` (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`).
2. Run `npm run db:seed` again if the admin was never created.
3. Remember that after first login you must change the temporary password.

### Port 3000 already in use

Stop the other process using port 3000, or start Next.js on another port:

```bash
npx next dev -p 3001
```

### Need a clean database

Warning: this deletes data.

```bash
npm run db:reset
npm run db:seed
```

---

## 14. Project summary

This is a mini web inventory system for one agricultural-input shop.

Included in the app:

- Login and sessions
- Admin users
- Dashboard
- Categories and products
- Stock in and stock out
- Inventory alerts
- Shop settings

Technology:

- JavaScript
- Next.js 15 (App Router)
- React 19
- Tailwind CSS 4
- PostgreSQL
- Prisma 6
