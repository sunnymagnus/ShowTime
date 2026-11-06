import { config } from "./config";
import { database } from "./database";

export const env = {
  DB: database,
  STUDIO_OWNER_EMAIL: config.ownerEmail,
  GUEST_SESSION_SECRET: config.sessionSecret,
};
