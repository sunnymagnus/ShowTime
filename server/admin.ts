import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { config } from "./config";

const cookieName = "showtime_admin";
const lifetime = 8 * 60 * 60;
const signature = (payload: string) =>
  createHmac("sha256", config.sessionSecret)
    .update("admin:" + payload)
    .digest("hex");
const equal = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function validCredentials(username: string, password: string) {
  const submitted = scryptSync(password, config.sessionSecret, 32);
  const expected = scryptSync(config.adminPassword, config.sessionSecret, 32);
  return (
    timingSafeEqual(submitted, expected) && username === config.adminUsername
  );
}
export function adminCookie() {
  const payload = Buffer.from(
    JSON.stringify({
      username: config.adminUsername,
      expires: Date.now() + lifetime * 1000,
    }),
  ).toString("base64url");
  return `${cookieName}=${payload}.${signature(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${lifetime}`;
}
export function clearAdminCookie() {
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
export async function getAdmin(req: Request) {
  const value = req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
  if (!value) return null;
  const [payload, mac, extra] = value.split(".");
  if (
    extra !== undefined ||
    !payload ||
    !mac ||
    !equal(mac, signature(payload))
  )
    return null;
  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (
      session.username !== config.adminUsername ||
      !Number.isFinite(session.expires) ||
      session.expires <= Date.now()
    )
      return null;
    return {
      userId: "admin:" + config.adminUsername,
      email: config.ownerEmail,
      fullName: "Admin",
      guest: false,
    };
  } catch {
    return null;
  }
}
export function safeReturnPath(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return "/?tab=Studio";
  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost" || url.pathname.startsWith("/admin/"))
      return "/?tab=Studio";
    return url.pathname + url.search;
  } catch {
    return "/?tab=Studio";
  }
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function loginPage(returnTo: string, failed = false) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Showtime admin</title><link rel="icon" href="/favicon.svg"><style>@font-face{font-family:Manrope;src:url('/fonts/manrope.ttf')}*{box-sizing:border-box}body{margin:0;background:#faf9fc;color:#252331;font-family:Manrope,Arial,sans-serif;display:grid;min-height:100vh;place-items:center;padding:24px}.card{width:100%;max-width:420px;background:white;border:1px solid #e8e5ec;border-radius:16px;padding:32px}a{color:#7953c9}.logo{font-size:28px;font-weight:800;text-decoration:none}h1{font-size:25px;margin-top:30px}p{font-size:13px;color:#796784;line-height:1.7}label{display:block;margin:18px 0 7px;font-size:13px}input,button{font:inherit;width:100%;padding:13px;border-radius:7px;border:1px solid #ddd}button{margin:24px 0 18px;background:#7953c9;color:white;border:0;font-weight:700;cursor:pointer}input:focus,button:focus{outline:3px solid #d6c5ea}.error{color:#a32c45}.back{font-size:12px}</style></head><body><main class="card"><a class="logo" href="/">showtime✳</a><h1>Admin sign in</h1><p>Manage project shows and view bookings on this computer. Customers can book as guests.</p>${failed ? '<p class="error" role="alert">The username or password is incorrect. Please try again.</p>' : ""}<form action="/api/admin/login" method="post"><input type="hidden" name="return_to" value="${escape(returnTo)}"><label for="username">Username</label><input id="username" name="username" autocomplete="username" required maxlength="100"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="200"><button type="submit">Sign in</button></form><a class="back" href="/">Back to movies</a></main></body></html>`;
}
