import cron from "node-cron";
import type { Server } from "socket.io";
import { prisma } from "../db/prisma.js";

export async function flagOverdueComplianceIssues(io?: Server) {
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
      io?.to(`user:${userId}`).emit("notification", notification);
    }
  }

  return overdue.length;
}

export function startOverdueComplianceJob(io: Server) {
  cron.schedule("0 * * * *", () => {
    flagOverdueComplianceIssues(io).catch((err) => console.error("overdue-compliance job failed", err));
  });
}
