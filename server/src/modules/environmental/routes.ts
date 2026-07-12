import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import {
  createErpOperationSchema,
  createEnvironmentalGoalSchema,
  carbonTransactionQuerySchema,
} from "./schema.js";
import * as environmentalService from "./service.js";
import { prisma } from "../../db/prisma.js";

export const environmentalRouter = Router();

environmentalRouter.use(requireAuth);

environmentalRouter.get("/emission-factors", async (_req, res) => {
  res.json(await prisma.emissionFactor.findMany({ orderBy: { name: "asc" } }));
});

environmentalRouter.post(
  "/erp-operations",
  requireRole("admin", "manager"),
  validateBody(createErpOperationSchema),
  async (req, res) => {
    const operation = await environmentalService.createErpOperation(req.body);
    res.status(201).json(operation);
  }
);

environmentalRouter.get(
  "/carbon-transactions",
  validateQuery(carbonTransactionQuerySchema),
  async (req, res) => {
    const result = await environmentalService.listCarbonTransactions(req.query as any);
    res.json(result);
  }
);

environmentalRouter.get("/goals", async (_req, res) => {
  res.json(await environmentalService.listEnvironmentalGoals());
});

environmentalRouter.post(
  "/goals",
  requireRole("admin", "manager"),
  validateBody(createEnvironmentalGoalSchema),
  async (req, res) => {
    const goal = await environmentalService.createEnvironmentalGoal(req.body);
    res.status(201).json(goal);
  }
);
