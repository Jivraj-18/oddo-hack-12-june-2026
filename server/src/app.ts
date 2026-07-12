import "express-async-errors";
import express from "express";
import cors from "cors";
import path from "node:path";
import { authRouter } from "./modules/auth/routes.js";
import { uploadsRouter } from "./modules/uploads/routes.js";
import { departmentsRouter } from "./modules/departments/routes.js";
import { usersRouter } from "./modules/users/routes.js";
import { environmentalRouter } from "./modules/environmental/routes.js";
import { socialRouter } from "./modules/social/routes.js";
import { gamificationRouter } from "./modules/gamification/routes.js";
import { governanceRouter } from "./modules/governance/routes.js";
import { reportsRouter } from "./modules/reports/routes.js";
import { dashboardRouter } from "./modules/dashboard/routes.js";
import { notificationsRouter } from "./modules/notifications/routes.js";
import { settingsRouter } from "./modules/settings/routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json());
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.get("/api/v1/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1", uploadsRouter);
  app.use("/api/v1/departments", departmentsRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1", environmentalRouter);
  app.use("/api/v1", socialRouter);
  app.use("/api/v1", gamificationRouter);
  app.use("/api/v1", governanceRouter);
  app.use("/api/v1", reportsRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/settings", settingsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
