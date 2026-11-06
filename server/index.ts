import { createApp } from "./app";
import { config, dataDirectory } from "./config";
import { database } from "./database";

const { app, closeFrontend } = await createApp({
  development: !process.argv.includes("--production"),
});
const server = app.listen(config.port, config.host, () => {
  console.log(`\nShowtime is running at http://localhost:${config.port}`);
  console.log(`Database: ${dataDirectory}`);
  console.log("Open the project in your editor. Press Ctrl+C here to stop.\n");
});
server.on("error", (error: any) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `Port ${config.port} is already in use. Stop the other server or set PORT in .env.`
      : error.message,
  );
  void closeFrontend?.().finally(() => process.exit(1));
  if (!closeFrontend) process.exit(1);
});
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  server.close();
  server.closeAllConnections();
  await closeFrontend?.();
  database.close();
  process.exit(0);
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
