import { env } from "./runtime";
import { getAdmin } from "./admin";
type Visitor = {
  userId: string;
  email: string;
  fullName: string | null;
  guest: boolean;
};
const COOKIE = "showtime_guest";
const LIFETIME = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();
function secret() {
  const value = (env as any).GUEST_SESSION_SECRET;
  if (typeof value !== "string" || value.length < 32)
    throw new Error("Guest session signing is not configured.");
  return value;
}
async function key() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
async function readGuest(req: Request): Promise<Visitor | null> {
  const value = req.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(COOKIE + "="))
    ?.slice(COOKIE.length + 1);
  if (!value) return null;
  const [id, created, signature, extra] = value.split(".");
  if (
    extra !== undefined ||
    !/^[a-f0-9-]{36}$/.test(id || "") ||
    !/^\d{13}$/.test(created || "") ||
    !/^[a-f0-9]{64}$/.test(signature || "")
  )
    return null;
  const age = Date.now() - Number(created);
  if (age < 0 || age > LIFETIME * 1000) return null;
  const bytes = Uint8Array.from(signature.match(/../g)!, (v) =>
    parseInt(v, 16),
  );
  if (
    !(await crypto.subtle.verify(
      "HMAC",
      await key(),
      bytes,
      encoder.encode(id + "." + created),
    ))
  )
    return null;
  return { userId: "guest:" + id, email: "", fullName: "Guest", guest: true };
}
export async function getVisitor(req: Request): Promise<Visitor | null> {
  const native = await getAdmin(req);
  if (native) return { ...native, guest: false };
  return readGuest(req);
}
export async function ensureVisitor(req: Request) {
  const current = await getVisitor(req);
  if (current) return { user: current, cookie: null };
  const id = crypto.randomUUID(),
    created = String(Date.now()),
    payload = id + "." + created;
  const token =
    payload +
    "." +
    hex(await crypto.subtle.sign("HMAC", await key(), encoder.encode(payload)));
  return {
    user: {
      userId: "guest:" + id,
      email: "",
      fullName: "Guest",
      guest: true,
    } as Visitor,
    cookie: `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${LIFETIME}`,
  };
}
export function allowedWriteOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  if (origin === new URL(req.url).origin) return true;
  return false;
}
