import { env } from "../runtime";

import { getAdmin } from "../admin";

import { showFor } from "../../shared/catalog";

const json = (d: any, status = 200) =>
  Response.json(d, { status, headers: { "Cache-Control": "no-store" } });

async function authorized(req: Request) {
  const u = await getAdmin(req);
  return (
    u &&
    u.email.toLowerCase() ===
      String((env as any).STUDIO_OWNER_EMAIL || "").toLowerCase()
  );
}

export async function GET(req: Request) {
  if (!(await authorized(req)))
    return json(
      { error: "This space is reserved for the project owner." },
      403,
    );
  try {
    const db = env.DB!;
    return json({
      bookings: (
        await db
          .prepare(
            "SELECT id,show,seats,total,status,created FROM bookings ORDER BY created DESC LIMIT 100",
          )
          .all()
      ).results,
      closed: (await db.prepare("SELECT id FROM closed_shows").all()).results,
    });
  } catch {
    return json({ error: "The management view could not be loaded." }, 503);
  }
}

export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return json({ error: "Invalid origin." }, 403);
  if (!(await authorized(req)))
    return json({ error: "Only the owner can change shows." }, 403);
  const b = (await req.json()) as any,
    show = showFor(b.show);
  if (!show || show.starts <= Date.now())
    return json({ error: "Choose a future show." }, 400);
  const db = env.DB!;
  if (b.action === "close") {
    await db.batch([
      db
        .prepare(
          "UPDATE queue SET status='ended' WHERE show=? AND status IN('waiting','offered')",
        )
        .bind(b.show),
      db
        .prepare("INSERT OR IGNORE INTO closed_shows(id,created) VALUES(?,?)")
        .bind(b.show, Date.now()),
      db
        .prepare(
          "UPDATE bookings SET status='cancelled' WHERE show=? AND status='confirmed'",
        )
        .bind(b.show),
      db
        .prepare(
          "UPDATE holds SET status='released' WHERE show=? AND status='held'",
        )
        .bind(b.show),
      db.prepare("DELETE FROM locks WHERE show=?").bind(b.show),
    ]);
    return json({ message: "Show cancelled and all seats released." });
  }
  if (b.action === "open") {
    await db.prepare("DELETE FROM closed_shows WHERE id=?").bind(b.show).run();
    return json({
      message: "Show reopened. Previous cancellations remain cancelled.",
    });
  }
  return json({ error: "Unknown action." }, 400);
}
