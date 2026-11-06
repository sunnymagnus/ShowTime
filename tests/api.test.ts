import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import {
  cinemas,
  dayKeys,
  showsFor,
  seatsFor,
  showFor,
} from "../shared/catalog";

const directory = mkdtempSync(path.join(tmpdir(), "showtime-test-"));
process.env.DATA_DIR = directory;
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "test-password-123";
let server: Server, base: string, db: any, createDatabase: any;
type Client = { cookie: string };
let alice: Client, bob: Client, carol: Client, admin: Client;
const shows = showsFor(dayKeys()[1]);
const show = shows[0];

async function call(
  client: Client | null,
  route = "/api/cinema",
  body?: unknown,
  origin?: string,
) {
  const response = await fetch(base + route, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(client ? { Cookie: client.cookie } : {}),
      ...(body === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: origin ?? base }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  return { status: response.status, data, response };
}
async function guest() {
  const r = await call(null);
  return { cookie: r.response.headers.getSetCookie()[0].split(";")[0] };
}
const hold = (c: Client, seats: string[], showId = show.id) =>
  call(c, "/api/cinema", { action: "hold", show: showId, seats });
const action = (c: Client, action: string, id: string) =>
  call(c, "/api/cinema", { action, id });
async function book(c: Client, seats: string[], showId: string) {
  const h = await hold(c, seats, showId);
  assert.equal(h.status, 200);
  const b = await action(c, "confirm", h.data.hold.id);
  assert.equal(b.status, 200);
  return b.data.booking as string;
}
async function login(password: string) {
  return fetch(base + "/api/admin/login", {
    method: "POST",
    redirect: "manual",
    headers: {
      Origin: base,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      username: "admin",
      password,
      return_to: "/?tab=Studio",
    }),
  });
}

before(async () => {
  const { createApp } = await import("../server/app");
  const storage = await import("../server/database");
  db = storage.database;
  createDatabase = storage.createDatabase;
  const { app } = await createApp({ frontend: false });
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  base = "http://127.0.0.1:" + (server.address() as any).port;
  alice = await guest();
  bob = await guest();
  carol = await guest();
});
after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections();
  });
  db.close();
  const resolved = realpathSync(directory);
  assert.ok(
    path.basename(resolved).startsWith("showtime-test-") &&
      path.dirname(resolved).toLowerCase() ===
        realpathSync(tmpdir()).toLowerCase(),
  );
  rmSync(resolved, { recursive: true, force: true });
});

test("Local API reports SQLite and needs no hosted service", async () => {
  const r = await call(null, "/api/health");
  assert.equal(r.status, 200);
  assert.equal(r.data.database, "SQLite");
  assert.equal(r.data.mode, "local");
});
test("Catalogue includes ten cinemas, 22 screens and 96 seats per show", () => {
  assert.equal(cinemas.length, 10);
  assert.equal(cinemas.filter((c) => c.type === "Multiplex").length, 5);
  assert.equal(
    cinemas.reduce((n, c) => n + c.screens, 0),
    22,
  );
  assert.equal(shows.length, 88);
  assert.equal(seatsFor(show).length, 96);
  assert.equal(showFor("2026-02-30~prasads~1~0"), undefined);
});
test("Guests get different signed cookies usable over localhost HTTP", async () => {
  assert.notEqual(alice.cookie, bob.cookie);
  const r = await call(alice);
  assert.equal(r.data.user.guest, true);
  assert.equal(r.data.user.isAdmin, false);
  const fresh = await call(null);
  const cookie = fresh.response.headers.getSetCookie()[0];
  assert.ok(cookie.includes("HttpOnly"));
  assert.ok(!cookie.includes("Secure"));
});
test("Unsigned writes, foreign origins and tampered guest cookies fail", async () => {
  assert.equal(
    (await call(null, "/api/cinema", { action: "hold" })).status,
    401,
  );
  assert.equal((await hold(alice, [])).status, 400);
  assert.equal(
    (
      await call(
        alice,
        "/api/cinema",
        { action: "hold" },
        "http://foreign.test",
      )
    ).status,
    403,
  );
  const bad = {
    cookie:
      alice.cookie.slice(0, -1) + (alice.cookie.endsWith("0") ? "1" : "0"),
  };
  assert.equal(
    (await call(bad, "/api/cinema", { action: "hold" })).status,
    401,
  );
});
test("Invalid seat identifiers, duplicate seats and excessive groups fail", async () => {
  for (const seats of [
    ["Z99"],
    ["A1", "A1"],
    ["A1", "A2", "A3", "A4", "A5", "A6", "A7"],
  ])
    assert.equal((await hold(alice, seats)).status, 400);
});
let holdId: string, bookingId: string;
test("A seat selection stores the server price and blocks another guest", async () => {
  const r = await hold(alice, ["A1", "A2"]);
  assert.equal(r.status, 200);
  holdId = r.data.hold.id;
  assert.equal(r.data.hold.total, 900);
  assert.equal((await hold(bob, ["A1"])).status, 409);
});
test("A conflicting group rolls back every change and keeps the previous hold", async () => {
  const old = await hold(bob, ["H1"]);
  assert.equal((await hold(bob, ["A1", "H2"])).status, 409);
  const r = await call(bob, "/api/cinema?show=" + encodeURIComponent(show.id));
  assert.equal(r.data.hold.id, old.data.hold.id);
  assert.ok(!r.data.occupied.some((s: any) => s.seat === "H2"));
  await action(bob, "release", old.data.hold.id);
});
test("Seat-only state exposes occupancy but keeps another guest hold private", async () => {
  const r = await call(
    bob,
    "/api/cinema?seatsOnly=1&show=" + encodeURIComponent(show.id),
  );
  assert.equal(r.data.occupied.length, 2);
  assert.equal(r.data.hold, null);
  assert.equal(
    (
      await call(
        alice,
        "/api/cinema?seatsOnly=1&show=" + encodeURIComponent(show.id),
      )
    ).data.hold.id,
    holdId,
  );
});
test("Only the hold owner confirms and repeated confirmation returns one booking", async () => {
  assert.equal((await action(bob, "confirm", holdId)).status, 409);
  const r = await action(alice, "confirm", holdId);
  assert.equal(r.status, 200);
  bookingId = r.data.booking;
  assert.equal(
    (await action(alice, "confirm", holdId)).data.booking,
    bookingId,
  );
});
test("Booking history and QR downloads are private", async () => {
  assert.equal((await call(bob)).data.bookings.length, 0);
  assert.equal((await action(bob, "cancel", bookingId)).status, 409);
  const bad = await fetch(base + "/api/ticket?id=" + bookingId, {
    headers: { Cookie: bob.cookie },
  });
  assert.equal(bad.status, 404);
  const good = await fetch(base + "/api/ticket?id=" + bookingId, {
    headers: { Cookie: alice.cookie },
  });
  assert.equal(good.status, 200);
  const html = await good.text();
  assert.ok(html.includes("data:image/png;base64,"));
  assert.ok(html.includes("not valid for admission"));
});
test("Cancellation releases seats and preserves the cancelled record", async () => {
  assert.equal((await action(alice, "cancel", bookingId)).status, 200);
  assert.equal((await call(alice)).data.bookings[0].status, "cancelled");
  assert.equal(
    (
      await call(
        bob,
        "/api/cinema?seatsOnly=1&show=" + encodeURIComponent(show.id),
      )
    ).data.occupied.length,
    0,
  );
});
test("Expired holds disappear and cannot be confirmed", async () => {
  const h = await hold(alice, ["B1"]);
  await db
    .prepare("UPDATE holds SET expires=? WHERE id=?")
    .bind(Date.now() - 1, h.data.hold.id)
    .run();
  await db
    .prepare("UPDATE locks SET expires=? WHERE hold=?")
    .bind(Date.now() - 1, h.data.hold.id)
    .run();
  assert.equal(
    (
      await call(
        bob,
        "/api/cinema?seatsOnly=1&show=" + encodeURIComponent(show.id),
      )
    ).data.occupied.length,
    0,
  );
  assert.equal((await action(alice, "confirm", h.data.hold.id)).status, 409);
});
test("Watchlist is persistent, private and deduplicated", async () => {
  for (let i = 0; i < 2; i++)
    await call(alice, "/api/cinema", {
      action: "save",
      movie: "jailer-2",
      saved: true,
    });
  assert.deepEqual((await call(alice)).data.saved, ["jailer-2"]);
  assert.deepEqual((await call(bob)).data.saved, []);
});
const queueShow = shows[3];
let filler: Client, firstBooking: string, offer: string;
test("Waitlist rejects requests when a matching group is already free", async () => {
  assert.equal(
    (
      await call(bob, "/api/cinema", {
        action: "join",
        show: queueShow.id,
        section: "Recliner",
        quantity: 6,
      })
    ).status,
    409,
  );
});
test("A full category accepts ordered waitlist entries and rejects duplicates", async () => {
  for (const seats of [
    ["A1", "A2", "A3", "A4", "A5", "A6"],
    ["A7", "A8", "A9", "A10", "A11", "A12"],
    ["B1", "B2", "B3", "B4", "B5", "B6"],
    ["B7", "B8", "B9", "B10", "B11", "B12"],
  ]) {
    const c = await guest();
    const b = await book(c, seats, queueShow.id);
    if (!firstBooking) {
      filler = c;
      firstBooking = b;
    }
  }
  for (const c of [bob, carol])
    assert.equal(
      (
        await call(c, "/api/cinema", {
          action: "join",
          show: queueShow.id,
          section: "Recliner",
          quantity: 6,
        })
      ).status,
      200,
    );
  assert.equal(
    (
      await call(bob, "/api/cinema", {
        action: "join",
        show: queueShow.id,
        section: "Recliner",
        quantity: 6,
      })
    ).status,
    409,
  );
});
test("Cancelling offers the released group to the earliest eligible visitor", async () => {
  await action(filler, "cancel", firstBooking);
  const b = (await call(bob)).data.queue[0];
  offer = b.offer;
  assert.equal(b.status, "offered");
  assert.equal((await call(carol)).data.queue[0].status, "waiting");
  assert.equal((await hold(alice, ["A1"], queueShow.id)).status, 409);
});
test("An expired offer rejects its owner and promotes the next waiting group", async () => {
  await db
    .prepare("UPDATE holds SET expires=? WHERE id=?")
    .bind(Date.now() - 1, offer)
    .run();
  await db
    .prepare("UPDATE locks SET expires=? WHERE hold=?")
    .bind(Date.now() - 1, offer)
    .run();
  assert.equal((await action(bob, "confirm", offer)).status, 409);
  const c = (await call(carol)).data.queue[0];
  assert.equal(c.status, "offered");
  assert.equal((await action(carol, "confirm", c.offer)).status, 200);
});
test("Twenty conflicting HTTP requests produce one successful seat group", async () => {
  const clients = await Promise.all(Array.from({ length: 20 }, guest));
  const results = await Promise.all(
    clients.map((c) => hold(c, ["H11", "H12"], shows[4].id)),
  );
  assert.equal(results.filter((r) => r.status === 200).length, 1);
});
test("Admin login rejects wrong credentials and creates a separate signed session", async () => {
  assert.equal((await call(alice, "/api/manage")).status, 403);
  const wrong = await login("wrong");
  assert.ok(wrong.headers.get("location")?.includes("error=1"));
  const good = await login("test-password-123");
  assert.equal(good.status, 303);
  admin = { cookie: good.headers.getSetCookie()[0].split(";")[0] };
  assert.equal((await call(admin)).data.user.isAdmin, true);
  assert.equal((await call(admin, "/api/manage")).status, 200);
});
test("Admin show cancellation releases seats and reopening preserves cancellations", async () => {
  assert.equal(
    (await call(alice, "/api/manage", { action: "close", show: queueShow.id }))
      .status,
    403,
  );
  assert.equal(
    (await call(admin, "/api/manage", { action: "close", show: queueShow.id }))
      .status,
    200,
  );
  assert.equal(
    (await call(alice, "/api/cinema?show=" + encodeURIComponent(queueShow.id)))
      .status,
    410,
  );
  assert.equal(
    (await call(admin, "/api/manage", { action: "open", show: queueShow.id }))
      .status,
    200,
  );
  assert.equal((await call(carol)).data.bookings[0].status, "cancelled");
});
test("SQLite records survive closing and reopening a database", async () => {
  const file = path.join(directory, "restart.sqlite");
  const one = createDatabase(file);
  await one
    .prepare("INSERT INTO watchlist(id,user,movie,created) VALUES(?,?,?,?)")
    .bind("proof", "guest-proof", "jailer-2", Date.now())
    .run();
  one.close();
  const two = createDatabase(file);
  assert.equal(
    (
      await two
        .prepare("SELECT movie FROM watchlist WHERE id=?")
        .bind("proof")
        .first()
    ).movie,
    "jailer-2",
  );
  two.close();
});
test("Logout clears the admin cookie without exposing credentials", async () => {
  const r = await fetch(base + "/admin/logout", {
    redirect: "manual",
    headers: { Cookie: admin.cookie },
  });
  assert.equal(r.status, 303);
  assert.ok(r.headers.getSetCookie()[0].includes("Max-Age=0"));
});
