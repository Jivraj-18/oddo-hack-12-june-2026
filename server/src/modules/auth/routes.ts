import { Router } from "express";
import { validateBody } from "../../middleware/validate.js";
import { registerSchema, loginSchema, refreshSchema } from "./schema.js";
import * as authService from "./service.js";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../db/prisma.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
});

authRouter.post("/login", validateBody(loginSchema), async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
});

authRouter.post("/refresh", validateBody(refreshSchema), async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken);
  res.status(200).json(result);
});

authRouter.patch("/me/tour-complete", requireAuth, async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { tourCompletedAt: new Date() },
    select: { id: true, tourCompletedAt: true },
  });
  res.json(user);
});
