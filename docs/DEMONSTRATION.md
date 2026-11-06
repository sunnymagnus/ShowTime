# Showing Showtime to your professor

## Before the presentation

1. Install Node.js 24 or later.
2. Open the project folder in VS Code.
3. In the terminal, run `npm install` once. Finish this before going offline.
4. Run `npm run dev` and open http://localhost:3000.
5. Keep a normal browser window and an incognito window ready. They represent two different visitors.

## A short demonstration

1. Show the terminal running the Node server and the local address in the browser.
2. Browse Movies. Search for a film and open its details.
3. Open Cinemas. Show the ten venues, then the Multiplex and Single screen filters.
4. Choose a future date and a show. Copy that localhost address into the incognito window.
5. Select a seat in the normal window. In about one or two refresh cycles, the same seat becomes unavailable in the other window.
6. Deselect it. The other window sees it become available again.
7. Select two seats and click Review booking. Confirm the free project booking.
8. Open My tickets and download the QR-reference ticket. Explain that no payment is collected and it is a demonstration ticket.
9. Cancel the booking and show its cancelled record. The seats become available again.
10. Open Admin in the footer. Sign in with username `admin` and password `Showtime@123`. Choose a future date and demonstrate cancellation/reopening of an unused project show.

To show persistence, make a booking, stop the server with Ctrl+C and start it again with `npm run dev`. Use the same browser and localhost address. The ticket remains in My tickets.

## Files to explain

| File                          | What to say                                                        |
| ----------------------------- | ------------------------------------------------------------------ |
| `package.json`                | Lists dependencies and the commands that run the project           |
| `server/index.ts`             | Starts the Node.js Express server                                  |
| `client/CinemaApp.tsx`        | Renders the interface and sends API requests                       |
| `shared/catalog.ts`           | Contains the films, venues, show generator and seat prices         |
| `server/routes/cinema.ts`     | Validates a selection, creates holds and confirms/cancels bookings |
| `server/database.ts`          | Uses local SQLite and groups related writes in one transaction     |
| `database/schema.sql`         | Defines the tables and unique seat-lock key                        |
| `server/services/waitlist.ts` | Finds adjacent seats and creates timed offers                      |
| `server/visitor.ts`           | Keeps guest records private to a signed browser session            |
| `server/admin.ts`             | Verifies local admin credentials and signs the admin session       |

The code is TypeScript, which is JavaScript with type annotations. React renders the browser UI, Vite handles development/building, Express handles requests and SQLite stores the data on disk. This version does not depend on a hosting platform.

## Questions you may be asked

**How do you stop two people booking the same seat?**

Every lock has a unique key made from the show and seat. The database rejects a second lock with that key. A group update runs in one transaction, so a conflicting seat causes the entire group change to roll back.

**What happens if a visitor closes the browser?**

An unconfirmed direct selection expires after up to five minutes on the server. The expiry is stored in the database. Reloading before it expires restores the hold.

**Why is customer login absent?**

The app creates a signed guest cookie automatically. Bookings and watchlist entries belong to that browser session. An admin uses a separate local login for management operations.

**How does the waitlist work?**

A visitor requests a show, category and number of seats together. The earliest eligible request gets matching seats in the same row and on the same side of the aisle. Its offer lasts up to ten minutes. Offers appear inside My tickets. If matching seats are already available, the app asks the visitor to select them directly.

**How can you prove the waitlist without filling a theatre during the presentation?**

Run `npm test`. It creates a temporary database, fills one category, joins two guests to the waitlist, cancels a booking and checks offer promotion and expiry. These test records are separate from your app's normal database.

**Where are records stored?**

In `.data/showtime.sqlite` on this computer. No separate database server is needed. Your database and generated signing key are excluded from Git and the source ZIP.

**Is this a real cinema service?**

It is a working student booking system. The movie and venue references make it easy to demonstrate, while the schedules, screen plans, prices and tickets are project data. There is no payment or real cinema admission integration.
