import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const envFile = path.join(projectRoot, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const dataDirectory = path.resolve(
  projectRoot,
  process.env.DATA_DIR || ".data",
);
mkdirSync(dataDirectory, { recursive: true });
const keyFile = path.join(dataDirectory, "session.key");
if (!existsSync(keyFile))
  writeFileSync(keyFile, randomBytes(48).toString("hex"), {
    mode: 0o600,
    flag: "wx",
  });

export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "127.0.0.1",
  sessionSecret: readFileSync(keyFile, "utf8").trim(),
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "Showtime@123",
  ownerEmail: "admin@showtime.local",
};
if (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535)
  throw new Error("PORT must be a valid port number.");
