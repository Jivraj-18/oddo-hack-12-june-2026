import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { prisma } from "../../db/prisma.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/", requireRole("admin", "manager"), async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true, departmentId: true },
    orderBy: { name: "asc" },
  });
  res.json(users);
});
