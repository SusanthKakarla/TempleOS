# TempleOS

## Local Development

### 1. Install dependencies

```sh
npm install
```

### 2. Create `.env.local`

Copy the example file:

```sh
cp .env.example .env.local
```

For a local Homebrew Postgres database named `templeos`, use:

```env
DATABASE_URL=postgresql://susanthkakarla@localhost:5432/templeos
```

Also fill in:

```env
SESSION_SECRET=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
TEMPLEOS_LOCAL_TENANT_HOST=your-temple.trytempleos.com
```

Generate a session secret with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`NEXT_PUBLIC_FIREBASE_API_KEY` is the Firebase web app API key. It is not the
same as `FIREBASE_PRIVATE_KEY`, which comes from a Firebase Admin SDK service
account JSON file.

### 3. Start local Postgres

If using Homebrew Postgres:

```sh
/opt/homebrew/opt/postgresql@16/bin/pg_ctl -D /opt/homebrew/var/postgresql@16 start
```

Create the database if it does not already exist:

```sh
/opt/homebrew/opt/postgresql@16/bin/createdb templeos
```

### 4. Run migrations and seed platform bootstrap data

```sh
npm run migrate
npm run seed
npm run seed:super-admin -- --phone "+14155552671" --name "Your Name"
```

`npm run seed` creates the fixed V0 role catalog. `seed:super-admin`
bootstraps the first platform super admin in `super_admins`; it does not attach
that person to a tenant.

Create real tenants through `/super-admin/temples/new` after signing in at
`/super-admin/login`, or use `npm run provision:temple` for scripted setup.
When signing in to the tenant dashboard from `http://localhost:3000`, the
backend uses `TEMPLEOS_LOCAL_TENANT_HOST` as the tenant hostname. Keep it equal
to the provisioned tenant domain.

### 5. Run the app

```sh
npm run dev
```

## Viewing the Database in Adminer

Run Adminer with Docker:

```sh
docker run --rm --name templeos-adminer -p 8080:8080 adminer
```

Open `http://localhost:8080` and use:

```text
System: PostgreSQL
Server: host.docker.internal
Username: susanthkakarla
Password: leave blank
Database: templeos
```

If Adminer does not allow a blank password, create a password-backed local user:

```sh
/opt/homebrew/opt/postgresql@16/bin/psql -h 127.0.0.1 -d postgres
```

Then run:

```sql
CREATE USER templeos WITH PASSWORD 'templeos';
GRANT ALL PRIVILEGES ON DATABASE templeos TO templeos;
```

Use these Adminer credentials instead:

```text
System: PostgreSQL
Server: host.docker.internal
Username: templeos
Password: templeos
Database: templeos
```

If using this user for the app, set:

```env
DATABASE_URL=postgresql://templeos:templeos@localhost:5432/templeos
```
