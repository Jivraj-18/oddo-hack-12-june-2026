import { prisma } from "../../db/prisma.js";
import { AppError } from "../../middleware/error-handler.js";
import { emitToUser } from "../../realtime.js";
import type { z } from "zod";
import type { createPolicySchema, createAuditSchema, createComplianceIssueSchema } from "./schema.js";

export async function createPolicy(input: z.infer<typeof createPolicySchema>) {
  return prisma.esgPolicy.create({ data: input });
}

export async function listPolicies() {
  return prisma.esgPolicy.findMany({ orderBy: { effectiveDate: "desc" } });
}

export async function acknowledgePolicy(policyId: string, userId: string) {
  const policy = await prisma.esgPolicy.findUnique({ where: { id: policyId } });
  if (!policy) {
    throw new AppError(404, "not_found", "Policy not found.");
  }
  const existing = await prisma.policyAcknowledgement.findUnique({ where: { policyId_userId: { policyId, userId } } });
  if (existing) {
    throw new AppError(409, "already_acknowledged", "You have already acknowledged this policy.");
  }
  return prisma.policyAcknowledgement.create({ data: { policyId, userId } });
}

export async function createAudit(input: z.infer<typeof createAuditSchema>) {
  return prisma.audit.create({ data: { ...input, status: "scheduled" } });
}

export async function listAudits() {
  return prisma.audit.findMany({ include: { department: true, issues: true }, orderBy: { auditDate: "desc" } });
}

export async function createComplianceIssue(auditId: string, input: z.infer<typeof createComplianceIssueSchema>) {
  const audit = await prisma.audit.findUnique({ where: { id: auditId } });
  if (!audit) {
    throw new AppError(404, "not_found", "Audit not found.");
  }
  const issue = await prisma.complianceIssue.create({ data: { ...input, auditId, status: "open" } });

  const admins = await prisma.user.findMany({ where: { role: "admin" } });
  for (const userId of new Set([issue.ownerUserId, ...admins.map((a) => a.id)])) {
    const body =
      userId === issue.ownerUserId
        ? `"${issue.description}" was opened and assigned to you.`
        : `"${issue.description}" was opened for ${audit.title}.`;
    const notification = await prisma.notification.create({
      data: { userId, type: "compliance_issue", title: "New compliance issue", body },
    });
    emitToUser(userId, "notification", notification);
  }

  return issue;
}

export async function listComplianceIssues() {
  return prisma.complianceIssue.findMany({
    include: { department: true, owner: true, audit: true },
    orderBy: [{ isOverdue: "desc" }, { dueDate: "asc" }],
  });
}

export async function updateComplianceIssueStatus(issueId: string, status: "open" | "in_progress" | "resolved") {
  const issue = await prisma.complianceIssue.findUnique({ where: { id: issueId } });
  if (!issue) {
    throw new AppError(404, "not_found", "Compliance issue not found.");
  }
  return prisma.complianceIssue.update({
    where: { id: issueId },
    data: {
      status,
      resolvedAt: status === "resolved" ? new Date() : null,
      isOverdue: status === "resolved" ? false : issue.isOverdue,
    },
  });
}
