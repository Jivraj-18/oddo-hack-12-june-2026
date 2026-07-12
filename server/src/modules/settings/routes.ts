import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { esgConfigSchema } from "./schema.js";
import { prisma } from "../../db/prisma.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get("/esg-config", async (_req, res) => {
  const config = await prisma.esgConfig.findFirst();
  res.json(config);
});

settingsRouter.put("/esg-config", requireRole("admin"), validateBody(esgConfigSchema), async (req, res) => {
  const existing = await prisma.esgConfig.findFirst();
  const updated = existing
    ? await prisma.esgConfig.update({ where: { id: existing.id }, data: req.body })
    : await prisma.esgConfig.create({ data: req.body });
  res.json(updated);
});
