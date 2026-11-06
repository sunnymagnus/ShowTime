import express, {
  type Request as ExpressRequest,
  type Response as ExpressResponse,
} from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { projectRoot } from "./config";
import * as cinema from "./routes/cinema";
import * as ticket from "./routes/ticket";
import * as manage from "./routes/manage";
import {
  validCredentials,
  adminCookie,
  clearAdminCookie,
  safeReturnPath,
  loginPage,
} from "./admin";

// Express owns the HTTP server. The same API handles development and built UI.
export async function createApp(
  options: { development?: boolean; frontend?: boolean } = {},
) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use(express.urlencoded({ extended: false, limit: "4kb" }));
  function request(req: ExpressRequest) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers))
      if (value !== undefined)
        headers.set(key, Array.isArray(value) ? value.join("; ") : value);
    const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    return new Request(url, {
      method: req.method,
      headers,
      ...(!["GET", "HEAD"].includes(req.method)
        ? { body: JSON.stringify(req.body ?? {}) }
        : {}),
    });
  }
  const adapt =
    (handler: (req: Request) => Promise<Response>) =>
    async (
      req: ExpressRequest,
      res: ExpressResponse,
      next: express.NextFunction,
    ) => {
      try {
        const response = await handler(request(req));
        res.status(response.status);
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.send(Buffer.from(await response.arrayBuffer()));
      } catch (error) {
        next(error);
      }
    };
  app.get("/api/health", (_req, res) =>
    res.json({
      status: "ok",
      application: "Showtime",
      database: "SQLite",
      mode: "local",
    }),
  );
  app.get("/api/cinema", adapt(cinema.GET));
  app.post("/api/cinema", adapt(cinema.POST));
  app.get("/api/ticket", adapt(ticket.GET));
  app.get("/api/manage", adapt(manage.GET));
  app.post("/api/manage", adapt(manage.POST));
  app.get("/admin/login", (req, res) =>
    res
      .set("Cache-Control", "no-store")
      .send(
        loginPage(safeReturnPath(req.query.return_to), req.query.error === "1"),
      ),
  );
  const attempts = new Map<string, { count: number; until: number }>();
  app.post("/api/admin/login", (req, res) => {
    const origin = `${req.protocol}://${req.get("host")}`;
    if (req.get("origin") !== origin)
      return void res.status(403).send("Invalid request origin.");
    const ip = req.ip || "local",
      now = Date.now(),
      entry = attempts.get(ip);
    if (entry && entry.until > now && entry.count >= 10)
      return void res
        .status(429)
        .send("Too many attempts. Please try again in a minute.");
    const back = safeReturnPath(req.body.return_to);
    if (
      typeof req.body.username !== "string" ||
      typeof req.body.password !== "string" ||
      !validCredentials(req.body.username, req.body.password)
    ) {
      attempts.set(ip, {
        count: entry && entry.until > now ? entry.count + 1 : 1,
        until: entry && entry.until > now ? entry.until : now + 60000,
      });
      return void res.redirect(
        303,
        "/admin/login?error=1&return_to=" + encodeURIComponent(back),
      );
    }
    attempts.delete(ip);
    res.setHeader("Set-Cookie", adminCookie());
    res.redirect(303, back);
  });
  app.get("/admin/logout", (_req, res) => {
    res.setHeader("Set-Cookie", clearAdminCookie());
    res.redirect(303, "/");
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  let closeFrontend: undefined | (() => Promise<void>);
  if (options.frontend !== false) {
    if (options.development) {
      const { createServer } = await import("vite");
      const vite = await createServer({
        root: projectRoot,
        configFile: path.join(projectRoot, "vite.config.ts"),
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      closeFrontend = () => vite.close();
    } else {
      const build = path.join(projectRoot, "dist");
      if (!existsSync(path.join(build, "index.html")))
        throw new Error(
          "Build the interface first with npm run build, or use npm run dev.",
        );
      app.use(express.static(build));
      app.get("/{*path}", (_req, res) =>
        res.sendFile(path.join(build, "index.html")),
      );
    }
  }
  app.use(
    (
      error: any,
      _req: ExpressRequest,
      res: ExpressResponse,
      _next: express.NextFunction,
    ) => {
      console.error(error.message);
      res.status(error.status === 400 ? 400 : 500).json({
        error:
          error.status === 400
            ? "The request body is invalid."
            : "The request could not be completed.",
      });
    },
  );
  return { app, closeFrontend };
}
