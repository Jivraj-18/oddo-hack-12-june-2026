import { prisma } from "../../db/prisma.js";
import { AppError } from "../../middleware/error-handler.js";
import type { z } from "zod";
import type { createErpOperationSchema, createEnvironmentalGoalSchema, carbonTransactionQuerySchema } from "./schema.js";

export async function createErpOperation(input: z.infer<typeof createErpOperationSchema>) {
  const config = await prisma.esgConfig.findFirst();
  const autoEmissionEnabled = config?.autoEmissionCalc ?? true;

  return prisma.$transaction(async (tx) => {
    const operation = await tx.erpOperation.create({ data: input });

    if (autoEmissionEnabled) {
      const factorId = input.emissionFactorId;
      if (!factorId) {
        throw new AppError(422, "validation_error", "An emission factor is required when auto emission calculation is enabled.", {
          emissionFactorId: "Select an emission factor to auto-calculate CO2e.",
        });
      }
      const factor = await tx.emissionFactor.findUnique({ where: { id: factorId } });
      if (!factor) {
        throw new AppError(404, "not_found", "Emission factor not found.");
      }
      const co2e = Number(input.quantity) * Number(factor.co2ePerUnit);
      await tx.carbonTransaction.create({
        data: {
          erpOperationId: operation.id,
          emissionFactorId: factor.id,
          departmentId: input.departmentId,
          quantity: input.quantity,
          co2e,
          source: "auto",
        },
      });
    }

    return operation;
  });
}

export async function createManualCarbonTransaction(input: {
  emissionFactorId: string;
  departmentId: string;
  quantity: number;
}) {
  const factor = await prisma.emissionFactor.findUnique({ where: { id: input.emissionFactorId } });
  if (!factor) {
    throw new AppError(404, "not_found", "Emission factor not found.");
  }
  return prisma.carbonTransaction.create({
    data: {
      emissionFactorId: factor.id,
      departmentId: input.departmentId,
      quantity: input.quantity,
      co2e: input.quantity * Number(factor.co2ePerUnit),
      source: "manual",
    },
  });
}

export async function listCarbonTransactions(query: z.infer<typeof carbonTransactionQuerySchema>) {
  const where = {
    ...(query.department ? { departmentId: query.department } : {}),
    ...(query.from || query.to
      ? { createdAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.carbonTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { emissionFactor: true, department: true },
    }),
    prisma.carbonTransaction.count({ where }),
  ]);
  return { items, total, page: query.page, limit: query.limit };
}

export async function createEnvironmentalGoal(input: z.infer<typeof createEnvironmentalGoalSchema>) {
  return prisma.environmentalGoal.create({ data: { ...input, currentCo2: 0, status: "active" } });
}

export async function listEnvironmentalGoals() {
  return prisma.environmentalGoal.findMany({ include: { department: true }, orderBy: { deadline: "asc" } });
}
