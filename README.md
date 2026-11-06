# Showtime

A Hyderabad cinema booking project that runs on your computer. The interface keeps the same movie cards, cinema listings, seating plan and purple design as the original app. This version uses a local Express server and SQLite database.

## Run it in VS Code

Install **Node.js 24 or later**. Open the folder containing this README and `package.json` in VS Code. Open **Terminal → New Terminal**, then run:

```sh
npm install
npm run dev
```

Open **http://localhost:3000**. Keep the terminal running. Press **Ctrl+C** to stop.

On Windows, if PowerShell blocks `npm.ps1`, use `npm.cmd install` and `npm.cmd run dev`. You can also double-click `START_SHOWTIME.cmd`.

After installing packages once, you can press **F5** in VS Code and choose **Run Showtime on localhost**. This starts the server under the debugger and opens the browser.

The database and signing key are created automatically in `.data/` on first run. No hosting account, API key or separate database installation is needed. Posters and fonts are included locally. An internet connection is needed for the initial package installation; the booking flow works offline afterward. The optional Google Maps link needs internet access.

## Admin

Click **Admin** in the footer, then **Admin sign in**.

| Field      | Local demonstration value         |
| ---------- | --------------------------------- |
| Username   | `admin`                           |
| Password   | `Showtime@123`                    |
| Login page | http://localhost:3000/admin/login |

The admin can choose a date, review recent bookings, cancel a future show and reopen a show. Cancelling a show also cancels its project bookings and releases held seats. Reopening does not restore cancelled tickets. Customers book as guests and do not sign in.

To change the local credentials or port, copy `.env.example` to `.env`, edit it and restart the server. The default server listens only on the local computer.

## Included features

- Ten Hyderabad cinema names: five multiplexes and five single screens.
- Eight film entries, movie details, search, language/genre filters and a private watchlist.
- Twenty-two configured screens and a rolling seven-day show schedule.
- Ninety-six seats per show with Recliner, Prime and Classic categories.
- Up to six seats per booking, held on selection for up to five minutes.
- Automatic seat updates between browser sessions, including release and cancellation.
- Group changes that either succeed completely or roll back completely.
- Free booking confirmation, private history and QR-reference ticket downloads.
- Cancellation before showtime.
- A waitlist for adjacent seats, eligible allocation and timed offers.
- Local admin sign-in and show management.
- Responsive desktop/mobile layouts, dialogs, loading states and validation.

Bookings are saved in the local database and survive a server restart. Guest tickets belong to the browser that booked them. Clearing cookies starts a new guest identity. An incognito window has a separate identity, which is useful for demonstrating seat conflicts.

## Project structure

```text
client/
  CinemaApp.tsx          Main React interface
  main.tsx              Browser entry point
  styles.css            The application's styles
server/
  index.ts              Starts the Express server
  app.ts                HTTP routes, local login and frontend serving
  config.ts             Local settings and automatic session key
  database.ts           SQLite access and atomic transactions
  visitor.ts            Guest sessions and request origin checks
  admin.ts              Admin password check and signed cookie
  routes/
    cinema.ts           Holds, booking, cancellation and watchlist
    ticket.ts           Private ticket download
    manage.ts           Admin show controls
  services/waitlist.ts   Adjacent-seat matching and offers
shared/catalog.ts       Films, cinemas, generated shows and seat prices
database/schema.sql     Complete SQL schema
public/                 Posters, favicon, fonts and their source notes
tests/                  API and browser checks
docs/                   Architecture and professor demonstration guide
```

The frontend and backend share the catalogue, so prices, shows and seat identifiers use the same definitions. The server validates every booking request and calculates its own total. Browser state alone cannot reserve a seat.

## Commands

| Command                | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Start localhost with live editing                            |
| `npm start`            | Build the interface, then serve the built application        |
| `npm run build`        | Generate the browser build in `dist/`                        |
| `npm run typecheck`    | Check TypeScript                                             |
| `npm test`             | Run 22 integration checks against a temporary local database |
| `npm run test:browser` | Run four browser journeys                                    |
| `npm run format`       | Format source code                                           |

For browser checks, first run `npx playwright install chromium`. If you want to use an installed Chrome instead, set `SHOWTIME_CHROME_PATH` to its executable path. Browser checks create and cancel test bookings in the running app's local database. API tests use a separate temporary database.

For an exact install from the committed lockfile, use `npm ci` instead of `npm install`.

## Data and local operation

`.data/showtime.sqlite` stores bookings, holds, locks, watchlist entries, closed shows and the waitlist. SQLite also creates temporary `-wal` and `-shm` companion files. `.data/session.key` signs guest/admin sessions and is generated separately on each computer.

Keep `.data/` if you want to retain your demonstration records. To start a new database without deleting anything, set `DATA_DIR=.data-fresh` in `.env` and restart. The app creates the new directory automatically. Switching the data directory also starts new signed sessions.

Seat maps poll about once per second while active. A selected seat becomes unavailable after the server accepts its hold. Deselecting, releasing or leaving direct selection releases the hold. Reloading recovers an unexpired hold; closing the browser is covered by the stored expiry. A waitlist offer lasts up to ten minutes and keeps its assigned group fixed. Queue reconciliation is request-driven, with wider booking/offer refresh about every twelve seconds.

## Presentation

See [the demonstration guide](docs/DEMONSTRATION.md) for a short walkthrough and the files to explain to your professor. See [the architecture notes](docs/ARCHITECTURE.md) for the database and request flow.

This repository's current version is the standalone localhost edition. The old hosting configuration and platform sign-in are not used. The earlier hosted implementation remains available in Git history.

Cinema names reference real venues, but configured screen counts, schedules, seat maps and prices are project data. No payment is collected. The downloaded tickets are not valid for admission at real cinemas. No real operator inventory, email or SMS service is connected. Catalogue/image sources are in `public/assets/SOURCES.md`; local font licenses are in `public/fonts/`.
