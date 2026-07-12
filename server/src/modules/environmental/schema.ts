import { z } from "zod";

export const activityTypeEnum = z.enum(["purchase", "manufacturing", "expense", "fleet"]);

export const createEmissionFactorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  activityType: activityTypeEnum,
  unit: z.string().min(1, "Unit is required."),
  co2ePerUnit: z.coerce.number().positive("CO2e per unit must be a positive number."),
  effectiveFrom: z.coerce.date(),
});

export const createErpOperationSchema = z.object({
  type: activityTypeEnum,
  referenceNo: z.string().min(1, "Reference number is required."),
  departmentId: z.string().uuid("Select a valid department."),
  emissionFactorId: z.string().uuid("Select a valid emission factor.").optional(),
  quantity: z.coerce.number().positive("Quantity must be a positive number."),
  unit: z.string().min(1, "Unit is required."),
  occurredAt: z.coerce.date(),
});

export const createEnvironmentalGoalSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  departmentId: z.string().uuid("Select a valid department."),
  targetCo2: z.coerce.number().positive("Target CO2 must be a positive number."),
  deadline: z.coerce.date().refine((d) => d.getTime() > Date.now(), "Deadline must be a future date."),
});

export const carbonTransactionQuerySchema = z.object({
  department: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
