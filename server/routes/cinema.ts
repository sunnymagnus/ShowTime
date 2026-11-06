import type { LocalDatabase } from "../database";
import { env } from "../runtime";
import { getVisitor, ensureVisitor, allowedWriteOrigin } from "../visitor";
import { movies, showFor, seatsFor } from "../../shared/catalog";
import { processQueue, contiguous } from "../services/waitlist";

const json = (data: any, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const owner = (u: any) =>
  !!u &&
  u.email.toLowerCase() ===
    String((env as any).STUDIO_OWNER_EMAIL || "").toLowerCase();
export async function expire(db: LocalDatabase) {
  const now = Date.now();
  await db.batch([
    db
      .prepare(
        "UPDATE queue SET status='expired' WHERE offer IN (SELECT id FROM holds WHERE status='held' AND expires<=?) AND status='offered'",
      )
      .bind(now),
    db
      .prepare(
        "UPDATE holds SET status='expired' WHERE status='held' AND expires<=?",
      )
      .bind(now),
    db
      .prepare("DELETE FROM locks WHERE booking IS NULL AND expires<=?")
      .bind(now),
  ]);
  await processQueue(db);
}
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    if (params.get("seatsOnly") === "1") {
      const show = showFor(params.get("show") || "");
      if (!show) return json({ error: "This show could not be found." }, 404);
      const db = env.DB!,
        now = Date.now(),
        user = await getVisitor(req);
      if (
        await db
          .prepare("SELECT id FROM closed_shows WHERE id=?")
          .bind(show.id)
          .first()
      )
        return json(
          { error: "This show has been cancelled. Please choose another." },
          410,
        );
      const occupied = (
        await db
          .prepare(
            "SELECT seat,booking IS NOT NULL AS booked FROM locks WHERE show=? AND (booking IS NOT NULL OR expires>?)",
          )
          .bind(show.id, now)
          .all()
      ).results;
      const hold = user
        ? await db
            .prepare(
              "SELECT id,seats,total,expires FROM holds WHERE show=? AND user=? AND status='held' AND expires>? ORDER BY created DESC LIMIT 1",
            )
            .bind(show.id, user.userId, now)
            .first()
        : null;
      return json({ occupied, hold, now });
    }
    const db = env.DB!;
    await expire(db);
    const session = await ensureVisitor(req),
      user = session.user,
      showId = new URL(req.url).searchParams.get("show");
    let show: any = null,
      occupied: any[] = [],
      ownHold: any = null;
    if (showId) {
      show = showFor(showId);
      if (!show) return json({ error: "This show could not be found." }, 404);
      const closed = await db
        .prepare("SELECT id FROM closed_shows WHERE id=?")
        .bind(showId)
        .first();
      if (closed)
        return json(
          { error: "This show has been cancelled. Please choose another." },
          410,
        );
      occupied = (
        await db
          .prepare(
            "SELECT seat,booking IS NOT NULL AS booked FROM locks WHERE show=?",
          )
          .bind(showId)
          .all()
      ).results;
      if (user)
        ownHold = await db
          .prepare(
            "SELECT id,seats,total,expires FROM holds WHERE show=? AND user=? AND status='held' AND expires>? ORDER BY created DESC LIMIT 1",
          )
          .bind(showId, user.userId, Date.now())
          .first();
    }
    const bookings = user
      ? (
          await db
            .prepare(
              "SELECT id,show,seats,total,status,created FROM bookings WHERE user=? ORDER BY created DESC LIMIT 100",
            )
            .bind(user.userId)
            .all()
        ).results
      : [];
    const saved = user
      ? (
          await db
            .prepare("SELECT movie FROM watchlist WHERE user=?")
            .bind(user.userId)
            .all()
        ).results.map((r: any) => r.movie)
      : [];
    const closed = (
      await db.prepare("SELECT id FROM closed_shows").all()
    ).results.map((r: any) => r.id);
    const queue = user
      ? (
          await db
            .prepare(
              "SELECT q.id,q.show,q.section,q.quantity,q.status,q.created,q.offer,h.seats,h.expires,(SELECT COUNT(*) FROM queue w WHERE w.show=q.show AND w.status='waiting' AND (w.created<q.created OR(w.created=q.created AND w.id<=q.id))) AS position FROM queue q LEFT JOIN holds h ON h.id=q.offer WHERE q.user=? AND q.status IN('waiting','offered') ORDER BY q.created",
            )
            .bind(user.userId)
            .all()
        ).results
      : [];
    const response = json({
      user: {
        name: user.fullName || user.email.split("@")[0],
        isAdmin: !user.guest && owner(user),
        guest: user.guest,
      },
      bookings,
      saved,
      show,
      occupied,
      hold: ownHold,
      closed,
      queue,
      now: Date.now(),
    });
    if (session.cookie) response.headers.set("Set-Cookie", session.cookie);
    return response;
  } catch (e) {
    console.error("cinema.get", e);
    return json(
      { error: "We couldn’t load the latest seats. Please try again." },
      503,
    );
  }
}
export async function POST(req: Request) {
  try {
    if (!allowedWriteOrigin(req))
      return json(
        { error: "Please use the Showtime website to make changes." },
        403,
      );
    const u = await getVisitor(req);
    if (!u)
      return json(
        {
          error:
            "Refresh this page to start your guest session, then try again.",
        },
        401,
      );
    const b = (await req.json()) as any,
      db = env.DB!,
      now = Date.now();
    await expire(db);
    if (b.action === "join") {
      const show = showFor(b.show);
      if (
        !show ||
        show.starts <= now ||
        !["Recliner", "Prime", "Classic"].includes(b.section) ||
        !Number.isInteger(b.quantity) ||
        b.quantity < 1 ||
        b.quantity > 6
      )
        return json(
          {
            error:
              "Choose a future show, seat category and between one and six seats.",
          },
          400,
        );
      if (
        await db
          .prepare("SELECT id FROM closed_shows WHERE id=?")
          .bind(b.show)
          .first()
      )
        return json({ error: "This show has been cancelled." }, 410);
      const active: any = await db
        .prepare(
          "SELECT COUNT(*) AS n FROM queue WHERE user=? AND status IN('waiting','offered')",
        )
        .bind(u.userId)
        .first();
      if (active.n >= 10)
        return json({ error: "You can join up to ten active waitlists." }, 400);
      const occupied = (
        await db
          .prepare("SELECT seat FROM locks WHERE show=?")
          .bind(b.show)
          .all()
      ).results.map((s: any) => s.seat);
      if (contiguous(seatsFor(show), occupied, b.section, b.quantity))
        return json(
          {
            error:
              "There are matching seats available. Please select them directly.",
          },
          409,
        );
      const id = crypto.randomUUID();
      const r = await db
        .prepare(
          "INSERT INTO queue(id,user,show,section,quantity,status,created) SELECT ?,?,?,?,?,'waiting',? WHERE NOT EXISTS(SELECT 1 FROM queue WHERE user=? AND show=? AND status IN('waiting','offered'))",
        )
        .bind(
          id,
          u.userId,
          b.show,
          b.section,
          b.quantity,
          now,
          u.userId,
          b.show,
        )
        .run();
      if (!r.meta.changes)
        return json(
          { error: "You already have an active waitlist entry for this show." },
          409,
        );
      return json({
        message:
          "You’re on the waitlist. Check My tickets for a timed offer when matching seats open.",
      });
    }
    if (b.action === "leave") {
      if (typeof b.id !== "string")
        return json({ error: "Choose a waitlist entry." }, 400);
      const entry: any = await db
        .prepare(
          "SELECT * FROM queue WHERE id=? AND user=? AND status IN('waiting','offered')",
        )
        .bind(b.id, u.userId)
        .first();
      if (!entry)
        return json({ error: "This waitlist entry is no longer active." }, 409);
      await db.batch([
        db
          .prepare("UPDATE queue SET status='left' WHERE id=? AND user=?")
          .bind(b.id, u.userId),
        db
          .prepare(
            "UPDATE holds SET status='released' WHERE id=? AND user=? AND status='held'",
          )
          .bind(entry.offer || "", u.userId),
        db
          .prepare(
            "DELETE FROM locks WHERE hold=? AND user=? AND booking IS NULL",
          )
          .bind(entry.offer || "", u.userId),
      ]);
      await processQueue(db);
      return json({ message: "You’ve left the waitlist." });
    }
    if (b.action === "save") {
      if (!movies.some((m) => m.id === b.movie))
        return json({ error: "Choose a movie from the catalogue." }, 400);
      const id = u.userId + "~" + b.movie;
      if (b.saved)
        await db
          .prepare(
            "INSERT OR IGNORE INTO watchlist(id,user,movie,created) VALUES(?,?,?,?)",
          )
          .bind(id, u.userId, b.movie, now)
          .run();
      else
        await db
          .prepare("DELETE FROM watchlist WHERE id=? AND user=?")
          .bind(id, u.userId)
          .run();
      return json({
        message: b.saved
          ? "Added to your watchlist."
          : "Removed from your watchlist.",
      });
    }
    if (b.action === "hold") {
      const show = showFor(b.show);
      if (!show || show.starts <= now)
        return json(
          { error: "This show has already started or is unavailable." },
          400,
        );
      if (
        await db
          .prepare("SELECT id FROM closed_shows WHERE id=?")
          .bind(b.show)
          .first()
      )
        return json({ error: "This show has been cancelled." }, 410);
      if (
        !Array.isArray(b.seats) ||
        b.seats.length < 1 ||
        b.seats.length > 6 ||
        new Set(b.seats).size !== b.seats.length
      )
        return json(
          { error: "Choose between one and six different seats." },
          400,
        );
      const layout = seatsFor(show);
      if (
        !b.seats.every(
          (id: any) =>
            typeof id === "string" && layout.some((s) => s.id === id),
        )
      )
        return json({ error: "Choose seats from the seating plan." }, 400);
      const count: any = await db
        .prepare(
          "SELECT COUNT(*) AS n FROM bookings WHERE user=? AND status='confirmed'",
        )
        .bind(u.userId)
        .first();
      if (count.n >= 50)
        return json(
          { error: "Your account has reached the project booking limit." },
          400,
        );
      const id = crypto.randomUUID(),
        expires = Math.min(now + 300000, show.starts),
        total = b.seats.reduce(
          (sum: number, id: string) =>
            sum + layout.find((s) => s.id === id)!.price,
          0,
        );
      try {
        await db.batch([
          db
            .prepare(
              "UPDATE queue SET status='left' WHERE user=? AND status='offered'",
            )
            .bind(u.userId),
          db
            .prepare(
              "UPDATE holds SET status='released' WHERE user=? AND status='held'",
            )
            .bind(u.userId),
          db
            .prepare("DELETE FROM locks WHERE user=? AND booking IS NULL")
            .bind(u.userId),
          db
            .prepare(
              "INSERT INTO holds(id,user,show,seats,total,expires,status,created) VALUES(?,?,?,?,?,?,'held',?)",
            )
            .bind(
              id,
              u.userId,
              b.show,
              JSON.stringify(b.seats),
              total,
              expires,
              now,
            ),
          ...b.seats.map((seat: string) =>
            db
              .prepare(
                "INSERT INTO locks(id,show,seat,hold,user,expires) VALUES(?,?,?,?,?,?)",
              )
              .bind(b.show + "~" + seat, b.show, seat, id, u.userId, expires),
          ),
        ]);
      } catch {
        console.warn(
          "Seat hold rejected because one or more seats are no longer available.",
        );
        return json(
          {
            error:
              "Someone just chose one of those seats. Your previous selection was kept. Refresh and try another seat.",
          },
          409,
        );
      }
      return json({
        hold: { id, seats: JSON.stringify(b.seats), total, expires },
        message: "Your seats are held for five minutes.",
      });
    }
    if (typeof b.id !== "string" || b.id.length > 150)
      return json({ error: "Choose a valid booking." }, 400);
    if (b.action === "release") {
      await db.batch([
        db
          .prepare(
            "UPDATE queue SET status='left' WHERE offer=? AND user=? AND status='offered'",
          )
          .bind(b.id, u.userId),
        db
          .prepare(
            "UPDATE holds SET status='released' WHERE id=? AND user=? AND status='held'",
          )
          .bind(b.id, u.userId),
        db
          .prepare(
            "DELETE FROM locks WHERE hold=? AND user=? AND booking IS NULL",
          )
          .bind(b.id, u.userId),
      ]);
      await processQueue(db);
      return json({ message: "Your held seats have been released." });
    }
    if (b.action === "confirm") {
      const existing: any = await db
        .prepare("SELECT id FROM bookings WHERE hold=? AND user=?")
        .bind(b.id, u.userId)
        .first();
      if (existing)
        return json({
          booking: existing.id,
          message: "Your booking is already confirmed.",
        });
      const h: any = await db
        .prepare(
          "SELECT * FROM holds WHERE id=? AND user=? AND status='held' AND expires>?",
        )
        .bind(b.id, u.userId, now)
        .first();
      if (!h)
        return json(
          {
            error:
              "Your seat hold has expired. Please choose your seats again.",
          },
          409,
        );
      const show = showFor(h.show);
      if (!show || show.starts <= now)
        return json({ error: "This show has already started." }, 409);
      const id = crypto.randomUUID(),
        n = JSON.parse(h.seats).length;
      const results = await db.batch([
        db
          .prepare(
            "INSERT INTO bookings(id,hold,user,show,seats,total,status,created) SELECT ?,?,?,?,?,?,'confirmed',? WHERE EXISTS(SELECT 1 FROM holds WHERE id=? AND user=? AND status='held' AND expires>?) AND (SELECT COUNT(*) FROM locks WHERE hold=? AND user=? AND booking IS NULL AND expires>?)=? AND NOT EXISTS(SELECT 1 FROM closed_shows WHERE id=?)",
          )
          .bind(
            id,
            h.id,
            u.userId,
            h.show,
            h.seats,
            h.total,
            now,
            h.id,
            u.userId,
            now,
            h.id,
            u.userId,
            now,
            n,
            h.show,
          ),
        db
          .prepare(
            "UPDATE locks SET booking=?,expires=NULL WHERE hold=? AND user=? AND EXISTS(SELECT 1 FROM bookings WHERE id=?)",
          )
          .bind(id, h.id, u.userId, id),
        db
          .prepare(
            "UPDATE holds SET status='confirmed' WHERE id=? AND user=? AND EXISTS(SELECT 1 FROM bookings WHERE id=?)",
          )
          .bind(h.id, u.userId, id),
        db
          .prepare(
            "UPDATE queue SET status='fulfilled' WHERE offer=? AND user=? AND EXISTS(SELECT 1 FROM bookings WHERE id=?)",
          )
          .bind(h.id, u.userId, id),
      ]);
      if (!results[0].meta.changes)
        return json(
          { error: "These seats are no longer held. Choose your seats again." },
          409,
        );
      return json({
        booking: id,
        message: "You’re in. Your tickets are ready!",
      });
    }
    if (b.action === "cancel") {
      const booking: any = await db
        .prepare(
          "SELECT * FROM bookings WHERE id=? AND user=? AND status='confirmed'",
        )
        .bind(b.id, u.userId)
        .first();
      if (!booking)
        return json({ error: "This booking cannot be cancelled." }, 409);
      const show = showFor(booking.show);
      if (!show || show.starts <= now)
        return json(
          { error: "Bookings cannot be cancelled after the show starts." },
          409,
        );
      await db.batch([
        db
          .prepare(
            "UPDATE bookings SET status='cancelled' WHERE id=? AND user=? AND status='confirmed'",
          )
          .bind(b.id, u.userId),
        db
          .prepare("DELETE FROM locks WHERE booking=? AND user=?")
          .bind(b.id, u.userId),
      ]);
      await processQueue(db);
      return json({
        message:
          "Booking cancelled. The seats are released to the next eligible waiting group, or made available again.",
      });
    }
    return json({ error: "That action is not available." }, 400);
  } catch (e) {
    console.error("cinema.post", e);
    return json(
      { error: "We couldn’t save that change. Please try again." },
      503,
    );
  }
}
