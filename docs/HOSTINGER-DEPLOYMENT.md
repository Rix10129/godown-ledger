# Deploying the Lahore textile company

The app runs once in the cloud. The Lahore office opens its HTTPS address on each PC or phone. Your laptop in Multan does not have to stay on. There is no connection to the poultry client's computer, database, accounts or hosting. Start with a NEW, EMPTY PostgreSQL database. Do not run the demo seed in production.

## 1. Check the hosting capability first

In Hostinger hPanel → Websites → Add website, check whether your account offers **Node.js Apps / Node.js Web Apps**. A Business plan name alone does not establish that this feature is included in your particular subscription. The onboarding environment could not access Hostinger's public documentation; the exact panel options and plan support have not been independently confirmed.

- If Node.js Apps is available, use the managed deployment below. This app needs Node 22.12+ (Node 22 LTS recommended) or Node 24, a Node server process, and outbound access to PostgreSQL.
- If you only have PHP/WordPress/file hosting, uploading this project to `public_html` will not run it. Use a Hostinger VPS with Docker, or another managed Node host, while keeping your domain at Hostinger. The VPS fallback is included below.
- Hostinger MySQL/phpMyAdmin is not this app's database. Provision a dedicated **PostgreSQL 15+** database, for example with Neon, if your hosting product does not supply PostgreSQL. You can manage that service from Multan; no office computer needs installation.

Official references to check against your current panel: [Hostinger support](https://www.hostinger.com/support/), [Next.js self hosting](https://nextjs.org/docs/app/guides/self-hosting), [Neon connection documentation](https://neon.com/docs/connect/connect-from-any-app). Application implementation also follows the authentication and Proxy documentation bundled with Next.js 16.4.2.

## 2. Create a separate PostgreSQL database

Create a new project/database for this client. Choose a region reasonably close to Lahore, such as Singapore, where available. Obtain its standard PostgreSQL connection URL. Keep TLS certificate/hostname verification enabled; use the provider's documented verified TLS configuration (`sslmode=verify-full` where supported). Never set `NODE_TLS_REJECT_UNAUTHORIZED=0` or `rejectUnauthorized:false`.

Use `DATABASE_URL` for the application connection. For a pooled endpoint, also set `DIRECT_URL` to the provider's direct PostgreSQL endpoint for Prisma migrations. Do not expose either URL in a public repository or send it in chat.

## 3. Upload/import the source and set secure variables

Deploy the supplied source ZIP through the Node.js application interface if ZIP upload is available, or import the updated GitHub repository after adding the reviewed release changes. The current GitHub `main` has NOT been updated automatically by this local release.

Application root is the directory containing `package.json`. Select Next.js when framework detection is offered. Install with `npm ci`, build with `npm run build`, and start with `npm start`. The `prestart` lifecycle applies tracked migrations and performs the optional one-time bootstrap before Next.js starts. If your panel runs a server directly and ignores npm lifecycle scripts, explicitly run `npm run db:deploy` and `npm run client:setup` through its supported deployment/terminal flow before starting the application. An ordinary static-site deployment is insufficient.

**Hostinger's managed Web App menu:** select branch `client/textile-release-2026-10-20`, Next.js, Node 22.x, root `./`, package manager `npm`, output `.next`, and **build command `npm run build:hostinger`**. The menu lists package scripts rather than accepting arbitrary shell commands. If this script is missing, save the environment variables, refresh the GitHub/repository settings, and reselect the release branch. This deployment-specific command builds first, then applies tracked migrations and optionally initializes the company before Hostinger starts the app, including when it bypasses npm's `prestart`. It requires database connectivity during deployment; a failure stops deployment. The ordinary `build` remains independent of database access. Repeated bootstrap preserves existing credentials, and after the first successful login remove all `INITIAL_*` values. Subsequent deployments still apply migrations and skip bootstrap when all five required bootstrap variables are absent.

Set these in the application's secure environment settings:

| Variable                  | Required value                                                         |
| ------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`            | New client PostgreSQL connection URL                                   |
| `DIRECT_URL`              | Direct URL if using a pooled application URL                           |
| `NEXTAUTH_URL`            | Exact final HTTPS address, e.g. `https://ledger.client-domain.example` |
| `NEXTAUTH_SECRET`         | An independent, random 32-byte secret                                  |
| `BACKUP_ENCRYPTION_KEY`   | Another independent random secret, kept separately from backups        |
| `CRON_SECRET`             | Another independent random secret for authenticated scheduled jobs     |
| `TZ`                      | `Asia/Karachi`                                                         |
| `INITIAL_COMPANY_NAME`    | Client's real textile company name                                     |
| `INITIAL_OWNER_NAME`      | Owner's name                                                           |
| `INITIAL_OWNER_EMAIL`     | Mill's shared login email                                              |
| `INITIAL_OWNER_PASSWORD`  | Unique password of at least 12 characters                              |
| `INITIAL_OWNER_PIN`       | Owner's own 4 digits                                                   |
| `INITIAL_COMPANY_ADDRESS` | Lahore office address, optional                                        |

Generate each random server secret independently on your own computer:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Do not reuse the database password for the mill password or any PIN. Enter actual values in hosting settings; `.env.example` contains placeholders, never working client credentials. Leave `ALLOW_PUBLIC_REGISTRATION` unset: public registration is disabled for this client installation.

Bootstrap is idempotent for the same company and owner. It does not reset an existing password/PIN and refuses to create the client in a database containing another company. After the first successful startup, REMOVE all `INITIAL_*` values from hosting settings and restart/redeploy. Never run `npm run db:seed`, `db:reset`, or `db:push` on the live company.

## 4. Connect the final address and HTTPS

Attach the chosen domain/subdomain using the DNS records shown by the hosting service. Enable its SSL certificate, then update `NEXTAUTH_URL` to the exact HTTPS origin and redeploy if necessary. Changing the address requires users to sign in again. Keep the site behind the host's HTTPS reverse proxy; do not expose PostgreSQL publicly.

Open `/api/health`: expect HTTP 200 with `status: ok`. A successful build alone does not prove that the deployed app can reach its database.

## 5. Acceptance test before handing over

1. Sign in with the mill email/password. It must show **Who is sitting here?**, without opening the books.
2. Enter a wrong owner PIN. It must stay locked. Enter the correct PIN and open the owner desk.
3. Under **More → People and pins**, create a godown keeper, salesman, and bookkeeper, each with different PINs. No extra owner role can be assigned here.
4. In Settings, confirm company name, email, address and currency. Company email is the destination for scheduled evening email.
5. Add one real mill, buyer and product. Set unit to KG/METER/THAAN as appropriate. Add opening balances only after the owner/accountant approves the starting figures.
6. Record a small agreed test purchase of 12.5 units, with expiry blank, then a credit sale of 2.75 units and a small recovery. Confirm stock, buyer balance, mill balance, P&L and trial balance. Do not invent entries in the client's live books: use a separate test database or agree on identifiable real entries.
7. Verify a direct mill-to-buyer deal leaves stock unchanged. Verify returns through their original invoice/purchase; rates are recalculated on the server.
8. Download an encrypted backup and perform the recovery drill in `BACKUP-RECOVERY.md` before relying on it.
9. Press **Leave the desk**, enter the keeper PIN and verify that only Mills and Stock open, without rates or financial exports. Repeat for salesman and bookkeeper.
10. On a second Lahore computer, log in with the same mill email and the appropriate person's PIN. Keep Stock open without editing while an entry is posted on the first PC: within about five seconds, it must read the same database. Read screens refresh automatically; unfinished entries are preserved and pause that refresh. if another till takes stock, the server refuses an oversell.

Cloud operation requires an Internet connection. Private HTML and financial pages are not cached for offline viewing. Closing any office browser or your laptop does not stop the cloud service.

## 6. Evening delivery and offsite backups

Manual WhatsApp/email share buttons work by opening the person's messaging application. They do NOT send automatically. For automation, configure the provider and schedule below. No real provider send has been performed by the development tests.

**Email:** supply `RESEND_API_KEY` and `RESEND_FROM_EMAIL` using a verified sending domain. Set the company's email in Settings. Provider acceptance is recorded; inbox delivery still needs a real acceptance test.

**WhatsApp:** optional Meta Cloud API setup requires an approved business sender, an approved template with exactly one body text parameter, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` (a version supported by your provider), `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE`, and `EVENING_WHATSAPP_TO` in international digits without `+`. The automatic template carries a short summary plus a link to the full note. The manual share button contains the full note. Provider approval and real delivery are external prerequisites. Unknown sends are held for operator review rather than retried blindly.

**Backups:** configure a private R2 bucket with `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, or the documented encrypted email backup destination (`ADMIN_EMAIL` and Resend). Keep the decryption key outside that storage account. Also enable database-provider backups/restore history appropriate to the client's tolerance for lost work; nightly application exports alone can lose up to a day's entries.

Schedule authenticated HTTPS requests with `Authorization: Bearer <CRON_SECRET>`:

| Endpoint            | Pakistan schedule                           | UTC schedule |
| ------------------- | ------------------------------------------- | ------------ |
| `/api/cron/evening` | 19:00; retries every 15 minutes until 23:45 | 14:00–18:45  |
| `/api/cron/backup`  | 19:30 nightly                               | 14:30        |

Use hPanel cron only if available for this hosting product and able to pass the header securely; otherwise use a supported external scheduler with secure custom headers. `vercel.json` does not configure schedules on Hostinger. Keep bearer tokens out of URLs. The helper `node scripts/scheduled-jobs.mjs evening` or `backup` uses secure environment variables and returns a failing exit code for failed HTTP jobs. Alert on HTTP 503, no destination, or missing delivery receipts. Review **provider acceptance**, then confirm an actual email/WhatsApp reaches the owner.

Required external destinations: your PostgreSQL hosts, `api.resend.com` if emailing, `graph.facebook.com` if using WhatsApp, and your R2 account hostname if storing backups. Setup additionally downloads from npm and `binaries.prisma.sh`.

## VPS fallback

Use a fresh Linux VPS with Docker Engine and Compose v2.20+. Point a domain/subdomain to that VPS. Upload/extract the source, then create a private `.env.production` at the project root with the variables above plus `DOMAIN` (hostname only) and an independent random hexadecimal `POSTGRES_PASSWORD`. Compose supplies the local database URLs itself. Do not place this file in a web-served folder or in Git.

```sh
docker compose --env-file .env.production -f deploy/compose.yml up -d --build
docker compose --env-file .env.production -f deploy/compose.yml ps
docker compose --env-file .env.production -f deploy/compose.yml logs --tail=80 app
```

The PostgreSQL volume persists; the app uses a non-root container user; Caddy terminates HTTPS automatically when public DNS and ports 80/443 are available. Only the web proxy publishes ports. Permit SSH only to the administrator, and public HTTP/HTTPS; do not publish the database port. Never run `docker compose down -v` on the client system. Remove bootstrap variables and recreate the app after the owner login succeeds. VPS deployment, public DNS, certificate issuance, and provider delivery must be validated on that actual host.

For updates: take a verified backup; upload the reviewed release; build; restart using the supported process manager/Compose. Migrations are tracked and additive. Keep the prior release and database snapshot for recovery; restore to a separate database before rolling back incompatible schemas.
