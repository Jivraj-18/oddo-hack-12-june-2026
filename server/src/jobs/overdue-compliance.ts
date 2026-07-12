import cron from "node-cron";
import { prisma } from "../db/prisma.js";
import { emitToUser } from "../realtime.js";

export async function flagOverdueComplianceIssues() {
  const overdue = await prisma.complianceIssue.findMany({
    where: { status: "open", isOverdue: false, dueDate: { lt: new Date() } },
  });

  for (const issue of overdue) {
    await prisma.complianceIssue.update({ where: { id: issue.id }, data: { isOverdue: true } });

    const admins = await prisma.user.findMany({ where: { role: "admin" } });
    const recipients = [issue.ownerUserId, ...admins.map((a) => a.id)];

    for (const userId of new Set(recipients)) {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: "issue_overdue",
          title: "Compliance issue overdue",
          body: `"${issue.description}" is past its due date.`,
        },
      });
      emitToUser(userId, "notification", notification);
    }
  }

  return overdue.length;
}

export function startOverdueComplianceJob() {
  cron.schedule("0 * * * *", () => {
    flagOverdueComplianceIssues().catch((err) => console.error("overdue-compliance job failed", err));
  });
}
