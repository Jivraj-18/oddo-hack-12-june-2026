import { prisma } from "../../db/prisma.js";
import { AppError } from "../../middleware/error-handler.js";
import { evaluateBadgesForUser } from "./badge-engine.js";
import { emitToUser } from "../../realtime.js";
import type { Notification } from "@prisma/client";
import type { z } from "zod";
import type { createChallengeSchema } from "./schema.js";

type ChallengeStatus = "draft" | "active" | "under_review" | "completed" | "archived";

const VALID_TRANSITIONS: Record<ChallengeStatus, ChallengeStatus[]> = {
  draft: ["active", "archived"],
  active: ["under_review", "archived"],
  under_review: ["completed", "archived"],
  completed: ["archived"],
  archived: [],
};

export async function createChallenge(input: z.infer<typeof createChallengeSchema>) {
  return prisma.challenge.create({ data: { ...input, status: "draft" } });
}

export async function listChallenges() {
  return prisma.challenge.findMany({ include: { category: true, _count: { select: { participations: true } } }, orderBy: { deadline: "asc" } });
}

export async function listChallengeParticipations(status?: "pending" | "approved" | "rejected") {
  return prisma.challengeParticipation.findMany({
    where: status ? { approvalStatus: status } : undefined,
    include: { user: true, challenge: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateChallengeStatus(challengeId: string, nextStatus: ChallengeStatus) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) {
    throw new AppError(404, "not_found", "Challenge not found.");
  }
  const allowed = VALID_TRANSITIONS[challenge.status as ChallengeStatus];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(422, "invalid_transition", `Cannot move a challenge from "${challenge.status}" to "${nextStatus}".`);
  }
  return prisma.challenge.update({ where: { id: challengeId }, data: { status: nextStatus } });
}

export async function joinChallenge(userId: string, challengeId: string, proofFilePath?: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) {
    throw new AppError(404, "not_found", "Challenge not found.");
  }
  if (challenge.status !== "active") {
    throw new AppError(422, "challenge_not_active", "This challenge is not open for participation.");
  }
  const existing = await prisma.challengeParticipation.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
  });
  if (existing) {
    throw new AppError(409, "already_joined", "You have already joined this challenge.");
  }
  return prisma.challengeParticipation.create({
    data: { challengeId, userId, proofFilePath, approvalStatus: "pending" },
  });
}

export async function completeChallengeParticipation(participationId: string, decision: "approved" | "rejected") {
  const participation = await prisma.challengeParticipation.findUnique({
    where: { id: participationId },
    include: { challenge: true },
  });
  if (!participation) {
    throw new AppError(404, "not_found", "Challenge participation not found.");
  }

  const config = await prisma.esgConfig.findFirst();
  const evidenceRequiredGlobal = config?.evidenceRequiredGlobal ?? true;

  if (decision === "approved" && evidenceRequiredGlobal && participation.challenge.evidenceRequired && !participation.proofFilePath) {
    throw new AppError(422, "evidence_required", "Proof of completion is required before this can be approved.", {
      proofFilePath: "Upload evidence before approving this challenge.",
    });
  }

  const xpAwarded = decision === "approved" ? participation.challenge.xp : 0;

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.challengeParticipation.update({
      where: { id: participationId },
      data: { approvalStatus: decision, xpAwarded, progressPct: decision === "approved" ? 100 : participation.progressPct },
    });

    let badgeNotifications: Notification[] = [];
    if (decision === "approved") {
      await tx.user.update({ where: { id: participation.userId }, data: { xpBalance: { increment: xpAwarded } } });
      badgeNotifications = await evaluateBadgesForUser(participation.userId, tx);
    }

    const notification = await tx.notification.create({
      data: {
        userId: participation.userId,
        type: "approval_decision",
        title: `Challenge ${decision}`,
        body: `Your participation in "${participation.challenge.title}" was ${decision}.`,
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

export async function listBadges(userId: string) {
  const [badges, owned] = await Promise.all([
    prisma.badge.findMany({ where: { status: "active" } }),
    prisma.userBadge.findMany({ where: { userId }, select: { badgeId: true, awardedAt: true } }),
  ]);
  const ownedMap = new Map(owned.map((o) => [o.badgeId, o.awardedAt]));
  return badges.map((badge) => ({ ...badge, unlocked: ownedMap.has(badge.id), awardedAt: ownedMap.get(badge.id) ?? null }));
}

export async function listRewards() {
  return prisma.reward.findMany({ where: { status: "active" }, orderBy: { pointsRequired: "asc" } });
}

export async function redeemReward(userId: string, rewardId: string) {
  return prisma.$transaction(async (tx) => {
    const reward = await tx.reward.findUnique({ where: { id: rewardId } });
    if (!reward) {
      throw new AppError(404, "not_found", "Reward not found.");
    }
    if (reward.stock <= 0) {
      throw new AppError(422, "out_of_stock", "This reward is out of stock.");
    }
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.pointsBalance < reward.pointsRequired) {
      throw new AppError(422, "insufficient_points", "You do not have enough points to redeem this reward.");
    }

    await tx.reward.update({ where: { id: reward.id }, data: { stock: { decrement: 1 } } });
    await tx.user.update({ where: { id: userId }, data: { pointsBalance: { decrement: reward.pointsRequired } } });
    const redemption = await tx.rewardRedemption.create({
      data: { rewardId: reward.id, userId, pointsSpent: reward.pointsRequired },
    });

    return redemption;
  });
}

export async function getLeaderboard(scope: "user" | "department") {
  if (scope === "user") {
    return prisma.user.findMany({
      where: { role: { not: "admin" } },
      orderBy: { xpBalance: "desc" },
      take: 20,
      select: { id: true, name: true, xpBalance: true, department: { select: { name: true } } },
    });
  }
  const latestPeriod = await prisma.departmentScore.findFirst({ orderBy: { period: "desc" }, select: { period: true } });
  if (!latestPeriod) return [];
  return prisma.departmentScore.findMany({
    where: { period: latestPeriod.period },
    orderBy: { totalScore: "desc" },
    include: { department: true },
  });
}
