import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import {
  createCsrActivitySchema,
  joinCsrActivitySchema,
  createDiversityMetricSchema,
} from "./schema.js";
import * as socialService from "./service.js";
import { prisma } from "../../db/prisma.js";

export const socialRouter = Router();

socialRouter.use(requireAuth);

socialRouter.get("/csr-activities", async (_req, res) => {
  res.json(await socialService.listCsrActivities());
});

socialRouter.post(
  "/csr-activities",
  requireRole("admin", "manager"),
  validateBody(createCsrActivitySchema),
  async (req, res) => {
    const activity = await socialService.createCsrActivity(req.body, req.user!.id);
    res.status(201).json(activity);
  }
);

socialRouter.post(
  "/csr-activities/:id/join",
  validateBody(joinCsrActivitySchema),
  async (req, res) => {
    const participation = await socialService.joinCsrActivity(req.user!.id, req.params.id, req.body.proofFilePath);
    res.status(201).json(participation);
  }
);

socialRouter.patch("/participations/:id/approve", requireRole("admin", "manager"), async (req, res) => {
  const participation = await socialService.reviewParticipation(req.params.id, "approved", req.user!.id);
  res.json(participation);
});

socialRouter.patch("/participations/:id/reject", requireRole("admin", "manager"), async (req, res) => {
  const participation = await socialService.reviewParticipation(req.params.id, "rejected", req.user!.id);
  res.json(participation);
});

socialRouter.get("/diversity-metrics", async (req, res) => {
  const departmentId = typeof req.query.department === "string" ? req.query.department : undefined;
  res.json(await socialService.listDiversityMetrics(departmentId));
});

socialRouter.post(
  "/diversity-metrics",
  requireRole("admin"),
  validateBody(createDiversityMetricSchema),
  async (req, res) => {
    const metric = await socialService.createDiversityMetric(req.body);
    res.status(201).json(metric);
  }
);

socialRouter.get("/categories", async (_req, res) => {
  res.json(await prisma.category.findMany({ orderBy: { name: "asc" } }));
});
