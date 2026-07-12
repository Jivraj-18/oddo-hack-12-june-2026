import type { Notification, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

type Tx = PrismaClient | Prisma.TransactionClient;

interface UnlockRule {
  metric: "xp" | "completed_challenges" | "csr_participations";
  op: ">=" | ">" | "==";
  value: number;
}

function compare(actual: number, op: UnlockRule["op"], value: number): boolean {
  if (op === ">=") return actual >= value;
  if (op === ">") return actual > value;
  return actual === value;
}

async function computeMetric(tx: Tx, userId: string, metric: UnlockRule["metric"]): Promise<number> {
  if (metric === "xp") {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { xpBalance: true } });
    return user?.xpBalance ?? 0;
  }
  if (metric === "completed_challenges") {
    return tx.challengeParticipation.count({ where: { userId, approvalStatus: "approved" } });
  }
  return tx.employeeParticipation.count({ where: { userId, approvalStatus: "approved" } });
}

export async function evaluateBadgesForUser(userId: string, tx: Tx = prisma): Promise<Notification[]> {
  const config = await tx.esgConfig.findFirst();
  if (config && !config.badgeAutoAward) return [];

  const [badges, ownedBadgeIds] = await Promise.all([
    tx.badge.findMany({ where: { status: "active" } }),
    tx.userBadge.findMany({ where: { userId }, select: { badgeId: true } }).then((rows) => new Set(rows.map((r) => r.badgeId))),
  ]);

  const metricCache = new Map<string, number>();
  const notifications: Notification[] = [];

  for (const badge of badges) {
    if (ownedBadgeIds.has(badge.id)) continue;
    const rule = badge.unlockRule as unknown as UnlockRule;
    if (!rule?.metric || !rule.op || rule.value === undefined) continue;

    if (!metricCache.has(rule.metric)) {
      metricCache.set(rule.metric, await computeMetric(tx, userId, rule.metric));
    }
    const actual = metricCache.get(rule.metric)!;

    if (compare(actual, rule.op, rule.value)) {
      try {
        await tx.userBadge.create({ data: { userId, badgeId: badge.id } });
        const notification = await tx.notification.create({
          data: {
            userId,
            type: "badge_unlock",
            title: `Badge unlocked: ${badge.name}`,
            body: badge.description,
          },
        });
        notifications.push(notification);
      } catch {
        // unique constraint on (userId, badgeId) guards against a double award race
      }
    }
  }

  return notifications;
}
