import { prisma } from "../../db/prisma.js";
import { AppError } from "../../middleware/error-handler.js";
import { evaluateBadgesForUser } from "../gamification/badge-engine.js";
import { emitToUser } from "../../realtime.js";
import type { Notification } from "@prisma/client";
import type { z } from "zod";
import type { createCsrActivitySchema, createDiversityMetricSchema } from "./schema.js";

export async function createCsrActivity(input: z.infer<typeof createCsrActivitySchema>, createdBy: string) {
  return prisma.csrActivity.create({ data: { ...input, createdBy, status: "open" } });
}

export async function listCsrActivities() {
  return prisma.csrActivity.findMany({
    include: { category: true, _count: { select: { participations: true } } },
    orderBy: { eventDate: "asc" },
  });
}

export async function joinCsrActivity(userId: string, csrActivityId: string, proofFilePath?: string) {
  const activity = await prisma.csrActivity.findUnique({ where: { id: csrActivityId } });
  if (!activity) {
    throw new AppError(404, "not_found", "CSR activity not found.");
  }
  if (activity.status === "closed") {
    throw new AppError(422, "activity_closed", "This activity is no longer open for participation.");
  }
  const existing = await prisma.employeeParticipation.findUnique({
    where: { userId_csrActivityId: { userId, csrActivityId } },
  });
  if (existing) {
    throw new AppError(409, "already_joined", "You have already joined this activity.");
  }
  return prisma.employeeParticipation.create({
    data: { userId, csrActivityId, proofFilePath, approvalStatus: "pending" },
  });
}

export async function reviewParticipation(participationId: string, decision: "approved" | "rejected", reviewerId: string) {
  const participation = await prisma.employeeParticipation.findUnique({
    where: { id: participationId },
    include: { csrActivity: true },
  });
  if (!participation) {
    throw new AppError(404, "not_found", "Participation record not found.");
  }

  const config = await prisma.esgConfig.findFirst();
  const evidenceRequiredGlobal = config?.evidenceRequiredGlobal ?? true;

  if (decision === "approved" && evidenceRequiredGlobal && participation.csrActivity.evidenceRequired && !participation.proofFilePath) {
    throw new AppError(422, "evidence_required", "Proof of participation is required before this can be approved.", {
      proofFilePath: "Upload evidence before approving this participation.",
    });
  }

  const pointsEarned = decision === "approved" ? participation.csrActivity.points : 0;

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.employeeParticipation.update({
      where: { id: participationId },
      data: {
        approvalStatus: decision,
        reviewedBy: reviewerId,
        pointsEarned,
        completionDate: decision === "approved" ? new Date() : null,
      },
    });

    let badgeNotifications: Notification[] = [];
    if (decision === "approved") {
      await tx.user.update({ where: { id: participation.userId }, data: { pointsBalance: { increment: pointsEarned } } });
      badgeNotifications = await evaluateBadgesForUser(participation.userId, tx);
    }

    const notification = await tx.notification.create({
      data: {
        userId: participation.userId,
        type: "approval_decision",
        title: `CSR participation ${decision}`,
        body: `Your participation in "${participation.csrActivity.title}" was ${decision}.`,
      },
    });

    return { record, notification, badgeNotifications };
  });

  emitToUser(participation.userId, "notification", updated.notification);
  for (const badgeNotification of updated.badgeNotifications) {
    emitToUser(participation.userId, "notification", badgeNotification);
  }
  return updated.record;
}

export async function createDiversityMetric(input: z.infer<typeof createDiversityMetricSchema>) {
  return prisma.diversityMetric.upsert({
    where: { departmentId_period: { departmentId: input.departmentId, period: input.period } },
    create: input,
    update: input,
  });
}

export async function listDiversityMetrics(departmentId?: string) {
  return prisma.diversityMetric.findMany({
    where: departmentId ? { departmentId } : undefined,
    include: { department: true },
    orderBy: { period: "desc" },
  });
}
