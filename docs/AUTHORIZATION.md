# Client desk access

Mill email/password authenticates the company and creates a locked, revocable server session. It does not expose a business actor. Each PIN is bcrypt-hashed on the server. PIN attempts serialize on the user row; five failures lock that person for 15 minutes. People and pins never returns password/PIN hashes to a browser.

Unlocking creates a new DeskSession and revokes the previous token. Leaving the desk, signing out, changing a PIN or disabling a person revokes affected desk sessions. Multiple computers can use the mill account concurrently. Proxy checks the database session and current role before rendering; business actions independently check permissions, and data queries scope to companyId. Navigation filtering is not the security boundary.

Keepers receive physical stock fields only through /godown and /mills. Salesmen see sales, buyers and recovery. Bookkeepers see trading/finance; only owners administer people and full backups. Legacy ADMIN is not another unrestricted owner. People creation cannot assign OWNER. Every active person's PIN is different. Server-side desk records are excluded from recovery so restoring a backup never revives old authenticated cookies.

Private HTML/RSC pages are network-only and use no-store; only hashed static assets may be service-worker cached. The shared cloud desk does not use the old offline financial page cache. Source middleware is now Next.js 16 Proxy; each actual deployment must retain it and HTTPS cookie support.
