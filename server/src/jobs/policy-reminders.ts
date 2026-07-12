import cron from "node-cron";
import { prisma } from "../db/prisma.js";
import { emitToUser } from "../realtime.js";

const REMINDER_COOLDOWN_DAYS = 7;

export async function sendPolicyReminders(): Promise<number> {
  const policies = await prisma.esgPolicy.findMany({ where: { status: "active" } });
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  const cooldownSince = new Date(Date.now() - REMINDER_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  let sent = 0;

  for (const policy of policies) {
    const acknowledgedUserIds = new Set(
      (await prisma.policyAcknowledgement.findMany({ where: { policyId: policy.id }, select: { userId: true } })).map(
        (a) => a.userId
      )
    );

    for (const user of users) {
      if (acknowledgedUserIds.has(user.id)) continue;

      const recentReminder = await prisma.notification.findFirst({
        where: {
          userId: user.id,
          type: "policy_reminder",
          body: { contains: policy.title },
          createdAt: { gte: cooldownSince },
        },
      });
      if (recentReminder) continue;

      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: "policy_reminder",
          title: "Policy acknowledgement pending",
          body: `Please review and acknowledge "${policy.title}".`,
        },
      });
      emitToUser(user.id, "notification", notification);
      sent += 1;
    }
  }

  return sent;
}

export function startPolicyReminderJob() {
  cron.schedule("0 9 * * *", () => {
    sendPolicyReminders().catch((err) => console.error("policy-reminders job failed", err));
  });
}
