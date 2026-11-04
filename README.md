# Showtime

Big screens. Better plans. A working Hyderabad cinema-booking project with no payment step.

**Live app:** https://showtime-hyderabad.vercel.app

## Included

- Ten Hyderabad cinema names: five multiplexes and five single-screen theatres.
- Eight films, local posters, movie details, search, genre and language filters, saved movies.
- Twenty-two configured project screens, four non-overlapping shows per screen per day, and a rolling seven-day schedule.
- Cinema, neighbourhood, venue-type and screen-format discovery.
- Ninety-six selectable seats per show: Recliner, Prime and Classic categories, with project prices.
- No customer sign-in. Signed, HttpOnly browser cookies provide private guest bookings and watchlists for up to 30 days.
- Up to six seats per booking, atomic group holds, a five-minute hold window and refresh recovery.
- Free confirmation, booking history, downloadable QR-reference tickets and cancellation before showtime.
- A first-come eligible waitlist for adjacent seats in a requested category. Offers last up to ten minutes.
- In-app offer notices, automatic polling, protected acceptance, decline, expiry and queue promotion.
- Owner-only show cancellation/reopening and a booking overview.
- Responsive layouts, mobile navigation, confirmation dialogs, focus handling, loading/error/empty states.

There is no checkout, card collection or charge. The ticket value is illustrative; the amount paid is zero.

## Important boundaries

This is an independent student project, not District and not a cinema operator. Venue names and localities reference real places, but schedules, screen counts, seating maps, formats and prices are configured demonstration data. Bookings persist and coordinate with other app visitors, but are **not valid for admission** at those cinemas. Posters belong to their respective owners. Public catalogue and image sources are in [SOURCES.md](public/assets/SOURCES.md).

The movie catalogue is a checked snapshot, not a live release feed. It needs editorial updates. No live cinema inventory, real ticketing integration, payment, SMS, email, refunds or commercial support service is connected.

## Stack

React, TypeScript and Vinext, developed with Node.js. Production runs as a Cloudflare Worker through Sites. Shared records are stored in Cloudflare D1. Drizzle defines the schema and generates migrations. QR references are generated with `qrcode`. Only admin access uses platform sign-in. Customer sessions use an HMAC-signed HttpOnly, Secure cookie. The signing key is a private runtime setting, never source code.

This differs from the original salon report's Express/PostgreSQL proposal. See [the project report](docs/PROJECT_REPORT.md) for the actual cinema architecture.

## Local setup

Use Node.js 26 for the SQLite route tests. The framework requires Node.js 22.13 or newer.

```sh
npm run install:ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_sticky_sheva_callister.sql
npm run dev -- --port 5174
```

Apply each migration once, in order. Do not replay an already applied migration against an existing database.

Local sign-in uses the starter's `seedy@sites.test` identity. This development identity is not present in production. To test owner controls locally, set `STUDIO_OWNER_EMAIL=seedy@sites.test` in the ignored `.dev.vars` file and restart the server. Production owner access is configured privately through the hosting platform and must match the owner's ChatGPT account email.

## Tests

```sh
npm test
npm run typecheck
npm run build
```

`tests/cinema.test.mjs` runs the production route code against an atomic SQLite adapter. It checks catalogue integrity, ownership, seat conflicts, all-or-nothing holds, server pricing, idempotent confirmation, QR tickets, cancellations, watchlist, queue order, expiry and owner controls. The competing-request test exercises logical conflicts; it does not establish hosted D1 throughput or commercial-scale capacity.

`tests/browser.cjs` runs desktop and mobile journeys, including local sign-in, hold recovery after reload, confirmation, QR-ticket download, cancellation/history, filters, watchlist, waitlist validation, keyboard dialogs and overflow checks. Its browser import and Chrome path reflect the Windows authoring environment; adjust these paths to run it elsewhere. Browser tests operate on the local database only.

## Storage and queue rules

- A seat-lock primary key combines the show and seat IDs. A conflicting insert rolls back the complete D1 batch, so a group cannot be partly held.
- Related hold, lock and booking changes run together. Confirmation checks account ownership, persisted deadline, seat count and show cancellation on the server.
- The waitlist is sorted by joining time and then ID. The earliest eligible group is offered adjacent seats in the requested category. A group too large for the available space may wait while a smaller eligible group proceeds.
- The allocator does not treat seats across the aisle as adjacent. It stores offers before notifying the browser.
- Expired offers cannot be confirmed. The next eligible group is considered on reconciliation. All deadlines survive server restarts.
- Reconciliation runs on API requests, cancellations and releases. An open browser polls every 12 seconds. When nobody visits, expiry processing resumes on the next request; there is **no independent background scheduler** in this version.
- Notifications are in-app. Visitors should check My tickets for waitlist offers. No email/SMS delivery is implied.

## Publishing and GitHub

The `.openai/hosting.json` file identifies this separate Site and declares the DB binding. Sites applies the committed SQL migration and publishes a packaged Worker. GitHub contains the reviewable source mirror; pushing to GitHub alone does not deploy this app. SlotFlow is a separate project and has not been repurposed.

Never commit `.env`, `.dev.vars`, credentials, local database state, `.wrangler`, `.sites-runtime` or generated build output. Production monitoring, independently scheduled queue processing, retention/deletion tooling, abuse controls and load testing remain necessary before commercial operation.

## Guest access and the new public address

Customers book directly without an account. My tickets, watchlist and waitlist are private to a signed browser session, valid for up to 30 days. Clearing cookies or moving to another device starts a new guest session; downloaded tickets can still be kept as files. Previously signed-in account bookings stay associated with that account.

The public entry point is `https://showtime-hyderabad.vercel.app`. Vercel forwards the app to the existing Worker and D1 backend, preserving the shared database. The proxy disables caching of personalized responses. `PUBLIC_ORIGIN` restricts writes to the deployed public origin. `GUEST_SESSION_SECRET` is a random private runtime key. Configure a separate random key in the ignored local `.dev.vars` for guest development; never commit the real key.

The footer **Admin** link opens the protected owner area on the backend host. Admins must authenticate as the configured project owner. Guest cookies cannot grant admin permissions. Customer booking requires no ChatGPT account.

## Seat selection across devices

Clicking a seat now immediately requests an exclusive server hold. There is no separate hold step. Adding or removing seats atomically replaces the held group, so other visitors cannot take a selected seat. Open seat maps fetch fresh seat-only state about once per second, without caching, and refresh when a tab regains focus. Deselecting, releasing, or navigating away from a direct seat selection releases the relevant hold. Closing the browser or losing connectivity is covered by the persisted five-minute expiry. A reload recovers an unexpired hold. Booked seats remain unavailable until cancellation. Waitlist offer seats remain fixed until accepted or released.

`tests/seat-sync.cjs` uses two independent browser contexts to verify click-time exclusion, deselection, grouped selections, reload, release, navigation, confirmation and cancellation. Use `SHOWTIME_TEST_URL` to target the deployed public app. The seat-only endpoint filters expired locks directly, so they stop appearing occupied even before cleanup removes the rows.
