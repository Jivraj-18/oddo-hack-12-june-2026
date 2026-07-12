import { Router } from "express";
import { validateBody } from "../../middleware/validate.js";
import { registerSchema, loginSchema, refreshSchema } from "./schema.js";
import * as authService from "./service.js";

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
