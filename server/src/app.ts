import "express-async-errors";
import express from "express";
import cors from "cors";
import { authRouter } from "./modules/auth/routes.js";
import { departmentsRouter } from "./modules/departments/routes.js";
import { environmentalRouter } from "./modules/environmental/routes.js";
import { dashboardRouter } from "./modules/dashboard/routes.js";
import { notificationsRouter } from "./modules/notifications/routes.js";
import { settingsRouter } from "./modules/settings/routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json());

  app.get("/api/v1/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/departments", departmentsRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1", environmentalRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/settings", settingsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
