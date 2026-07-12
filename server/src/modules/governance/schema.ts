import { z } from "zod";

export const createPolicySchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  body: z.string().optional(),
  filePath: z.string().optional(),
  version: z.string().min(1, "Version is required."),
  effectiveDate: z.coerce.date(),
});

export const createAuditSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  departmentId: z.string().uuid("Select a valid department."),
  auditorName: z.string().min(2, "Auditor name is required."),
  auditDate: z.coerce.date(),
  findingsSummary: z.string().optional(),
});

export const createComplianceIssueSchema = z.object({
  description: z.string().min(5, "Description must be at least 5 characters."),
  severity: z.enum(["low", "medium", "high"]),
  departmentId: z.string().uuid("Select a valid department."),
  ownerUserId: z.string().uuid("Select a valid owner."),
  dueDate: z.coerce.date().refine((d) => d.getTime() > Date.now(), "Deadline must be a future date."),
});

export const updateComplianceIssueSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
});
