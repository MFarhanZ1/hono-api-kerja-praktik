import { Hono } from "hono";
import { cors } from "hono/cors";
import { RegExpRouter } from "hono/router/reg-exp-router";
import { BlankEnv, BlankSchema } from "hono/types";
import GlobalHandler from "./handlers/global.handler";
import globalRoute from "./routes/global.route";
import bimbinganKPRoute from "./routes/bimbingan-kp.route";
import dailyReportRoute from "./routes/daily-report.route";
import seminarKPRoute from "./routes/seminar-kp.route";
import daftarKPRoute from "./routes/daftar-kp.route";
import LogMiddleware from "./middlewares/log.middleware";

// Init Hono Object and Load environment variables from .env file
const app: Hono<BlankEnv, BlankSchema, "/"> = new Hono({
  router: new RegExpRouter(),
});
const { APP_PORT }: NodeJS.ProcessEnv = process.env;

// Load all available middlewares
app.use("*", LogMiddleware.hanzLogger);
app.use(
  "*",
  cors({
    origin: "*", // restrict this in production
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length", "X-Request-Id"],
    maxAge: 3600,
    credentials: true,
  })
);

// Load all default routes for common handling
app.notFound(GlobalHandler.notFound);
app.onError(GlobalHandler.error);

// Load all available routes
app.route("/", globalRoute);
app.route("/", daftarKPRoute);
app.route("/", dailyReportRoute);
app.route("/", bimbinganKPRoute);
app.route("/seminar-kp", seminarKPRoute);

export default {
  port: APP_PORT || 5000,
  fetch: app.fetch,
};

console.log(`[INFO] Server is on fire at port ${APP_PORT}! 🔥`);
