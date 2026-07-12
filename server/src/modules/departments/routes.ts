import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { createDepartmentSchema } from "./schema.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../middleware/error-handler.js";

export const departmentsRouter = Router();

departmentsRouter.use(requireAuth);

departmentsRouter.get("/", async (_req, res) => {
  res.json(await prisma.department.findMany({ orderBy: { name: "asc" }, include: { head: true, parent: true } }));
});

departmentsRouter.post("/", requireRole("admin"), validateBody(createDepartmentSchema), async (req, res) => {
  const existing = await prisma.department.findUnique({ where: { code: req.body.code } });
  if (existing) {
    throw new AppError(409, "code_taken", "A department with this code already exists.", { code: "Department code is already in use." });
  }
  const department = await prisma.department.create({ data: req.body });
  res.status(201).json(department);
});

departmentsRouter.patch("/:id", requireRole("admin"), validateBody(createDepartmentSchema.partial()), async (req, res) => {
  const department = await prisma.department.findUnique({ where: { id: req.params.id } });
  if (!department) {
    throw new AppError(404, "not_found", "Department not found.");
  }
  const updated = await prisma.department.update({ where: { id: department.id }, data: req.body });
  res.json(updated);
});
