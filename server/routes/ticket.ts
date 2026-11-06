import { env } from "../runtime";
import { getVisitor } from "../visitor";
import { showFor, movies, cinemas } from "../../shared/catalog";
import QRCode from "qrcode";

const esc = (s: any) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function GET(req: Request) {
  const u = await getVisitor(req);
  if (!u)
    return new Response(
      "Open Showtime in the browser where you booked to download your ticket.",
      { status: 401 },
    );
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("Ticket not found", { status: 404 });
  const b: any = await env
    .DB!.prepare("SELECT * FROM bookings WHERE id=? AND user=?")
    .bind(id, u.userId)
    .first();
  if (!b) return new Response("Ticket not found", { status: 404 });
  const show = showFor(b.show, true);
  if (!show) return new Response("Ticket details unavailable", { status: 404 });
  const movie = movies.find((m) => m.id === show.movie)!,
    cinema = cinemas.find((c) => c.id === show.cinema)!;
  const code = await QRCode.toDataURL("showtime:" + b.id, {
    width: 200,
    margin: 2,
    color: { dark: "#272233", light: "#ffffff" },
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Showtime ticket</title><style>body{background:#f3f1f6;font:16px Arial;color:#211e29;padding:40px}.ticket{max-width:620px;margin:auto;background:white;padding:40px;border-radius:18px}h1{font-size:34px}h2{font-size:25px}.pill{background:#e5ffc9;padding:8px;display:inline-block}p{line-height:1.7}small{color:#726a7f}hr{border:0;border-top:1px dashed #bbb;margin:25px 0}img{display:block;margin:20px auto}.notice{background:#f4edf9;padding:15px;font-size:13px}@media print{body{padding:0;background:white}.ticket{padding:15px}}</style></head><body><div class="ticket"><h2>showtime<span style="color:#8663cb">✳</span></h2><span class="pill">${esc(b.status.toUpperCase())} · PROJECT TICKET</span><h1>${esc(movie.title)}</h1><p>${esc(cinema.name)}<br>${esc(cinema.area)}, Hyderabad<br>Screen ${show.screen} · ${esc(show.format)} · ${esc(show.language)}</p><hr><p><b>${esc(show.day)} · ${esc(show.time)} IST</b><br>Seats: ${esc(JSON.parse(b.seats).join(", "))}<br>Illustrative value: ₹${b.total} · Paid: ₹0<br>No payment collected.</p><img src="${code}" alt="Booking reference QR code"><p style="text-align:center"><b>${esc(b.id.slice(0, 8).toUpperCase())}</b><br><small>Full reference: ${esc(b.id)}</small></p><div class="notice">This is a working student-project booking. It is not valid for admission at a real cinema. Cinemas, seat plans, prices and schedules are demonstration data. The QR code identifies this project booking only.</div></div></body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="showtime-${id.slice(0, 8)}.html"`,
      "Cache-Control": "private,no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
    },
  });
}
