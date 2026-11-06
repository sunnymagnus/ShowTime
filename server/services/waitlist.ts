import type { LocalDatabase } from "../database";
import { showFor, seatsFor } from "../../shared/catalog";
export function contiguous(
  layout: ReturnType<typeof seatsFor>,
  occupied: string[],
  section: string,
  count: number,
) {
  const available = layout.filter(
    (s) => s.section === section && !occupied.includes(s.id),
  );
  for (const seat of available) {
    const end = seat.number + count - 1;
    if (seat.number <= 6 && end >= 7) continue;
    const group = available.filter(
      (s) => s.row === seat.row && s.number >= seat.number && s.number <= end,
    );
    if (group.length === count) return group;
  }
  return null;
}
export async function processQueue(db: LocalDatabase) {
  const entries = (
    await db
      .prepare(
        "SELECT * FROM queue WHERE status='waiting' ORDER BY created,id LIMIT 30",
      )
      .all()
  ).results as any[];
  for (const e of entries) {
    const now = Date.now(),
      show = showFor(e.show);
    if (!show || show.starts <= now) {
      await db
        .prepare(
          "UPDATE queue SET status='ended' WHERE id=? AND status='waiting'",
        )
        .bind(e.id)
        .run();
      continue;
    }
    if (
      await db
        .prepare(
          "SELECT id FROM holds WHERE user=? AND status='held' AND expires>? LIMIT 1",
        )
        .bind(e.user, now)
        .first()
    )
      continue;
    if (
      await db
        .prepare("SELECT id FROM closed_shows WHERE id=?")
        .bind(e.show)
        .first()
    )
      continue;
    const occupied = (
      await db.prepare("SELECT seat FROM locks WHERE show=?").bind(e.show).all()
    ).results.map((s: any) => s.seat);
    const group = contiguous(seatsFor(show), occupied, e.section, e.quantity);
    if (!group) continue;
    const id = "wl-" + e.id,
      expires = Math.min(now + 600000, show.starts),
      ids = group.map((s) => s.id),
      total = group.reduce((sum, s) => sum + s.price, 0);
    try {
      await db.batch([
        db
          .prepare(
            "INSERT INTO holds(id,user,show,seats,total,expires,status,created) VALUES(?,?,?,?,?,?,'held',?)",
          )
          .bind(id, e.user, e.show, JSON.stringify(ids), total, expires, now),
        ...ids.map((seat) =>
          db
            .prepare(
              "INSERT INTO locks(id,show,seat,hold,user,expires) VALUES(?,?,?,?,?,?)",
            )
            .bind(e.show + "~" + seat, e.show, seat, id, e.user, expires),
        ),
        db
          .prepare(
            "UPDATE queue SET status='offered',offer=? WHERE id=? AND status='waiting'",
          )
          .bind(id, e.id),
      ]);
    } catch {
      /* Another request may have allocated these same seats atomically. The next refresh retries. */
    }
  }
}
