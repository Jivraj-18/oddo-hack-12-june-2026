import { prisma } from "../../db/prisma.js";
import type { z } from "zod";
import type { reportFilterSchema } from "./schema.js";

export interface ReportRow {
  department: string;
  [key: string]: string | number;
}

export interface ReportResult {
  title: string;
  columns: string[];
  rows: ReportRow[];
}

type Filters = z.infer<typeof reportFilterSchema>;

function dateRangeWhere(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  return { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
}

export async function buildEnvironmentalReport(filters: Filters): Promise<ReportResult> {
  const departments = await prisma.department.findMany({
    where: filters.department ? { id: filters.department } : undefined,
  });

  const rows: ReportRow[] = [];
  for (const dept of departments) {
    const createdAt = dateRangeWhere(filters.from, filters.to);
    const transactions = await prisma.carbonTransaction.findMany({
      where: { departmentId: dept.id, ...(createdAt ? { createdAt } : {}) },
    });
    const totalCo2e = transactions.reduce((sum, t) => sum + Number(t.co2e), 0);
    rows.push({
      department: dept.name,
      "Transactions": transactions.length,
      "Total CO2e (kg)": Number(totalCo2e.toFixed(2)),
    });
  }

  return { title: "Environmental Report", columns: ["department", "Transactions", "Total CO2e (kg)"], rows };
}

export async function buildSocialReport(filters: Filters): Promise<ReportResult> {
  const departments = await prisma.department.findMany({
    where: filters.department ? { id: filters.department } : undefined,
  });

  const createdAt = dateRangeWhere(filters.from, filters.to);

  const rows: ReportRow[] = [];
  for (const dept of departments) {
    const users = await prisma.user.findMany({
      where: { departmentId: dept.id, ...(filters.employee ? { id: filters.employee } : {}) },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    const participations = userIds.length
      ? await prisma.employeeParticipation.findMany({
          where: {
            userId: { in: userIds },
            ...(createdAt ? { createdAt } : {}),
            ...(filters.category ? { csrActivity: { categoryId: filters.category } } : {}),
          },
        })
      : [];
    const approved = participations.filter((p) => p.approvalStatus === "approved").length;
    rows.push({
      department: dept.name,
      "Total Participations": participations.length,
      "Approved": approved,
      "Approval Rate (%)": participations.length > 0 ? Number(((approved / participations.length) * 100).toFixed(1)) : 0,
    });
  }

  return { title: "Social Report", columns: ["department", "Total Participations", "Approved", "Approval Rate (%)"], rows };
}

export async function buildGovernanceReport(filters: Filters): Promise<ReportResult> {
  const departments = await prisma.department.findMany({
    where: filters.department ? { id: filters.department } : undefined,
  });

  const createdAt = dateRangeWhere(filters.from, filters.to);

  const rows: ReportRow[] = [];
  for (const dept of departments) {
    const issues = await prisma.complianceIssue.findMany({
      where: {
        departmentId: dept.id,
        ...(createdAt ? { createdAt } : {}),
        ...(filters.employee ? { ownerUserId: filters.employee } : {}),
      },
    });
    const open = issues.filter((i) => i.status !== "resolved").length;
    const overdue = issues.filter((i) => i.isOverdue).length;
    rows.push({
      department: dept.name,
      "Total Issues": issues.length,
      "Open Issues": open,
      "Overdue Issues": overdue,
    });
  }

  return { title: "Governance Report", columns: ["department", "Total Issues", "Open Issues", "Overdue Issues"], rows };
}

export async function buildEsgSummaryReport(filters: Filters): Promise<ReportResult> {
  const periodRecord = filters.to
    ? await prisma.departmentScore.findFirst({
        where: { period: { lte: filters.to.toISOString().slice(0, 7) } },
        orderBy: { period: "desc" },
        select: { period: true },
      })
    : await prisma.departmentScore.findFirst({ orderBy: { period: "desc" }, select: { period: true } });

  const scores = periodRecord
    ? await prisma.departmentScore.findMany({
        where: { period: periodRecord.period, ...(filters.department ? { departmentId: filters.department } : {}) },
        include: { department: true },
        orderBy: { totalScore: "desc" },
      })
    : [];

  const rows: ReportRow[] = scores.map((s) => ({
    department: s.department.name,
    "Environmental": Number(s.environmentalScore),
    "Social": Number(s.socialScore),
    "Governance": Number(s.governanceScore),
    "Total": Number(s.totalScore),
  }));

  return { title: "ESG Summary Report", columns: ["department", "Environmental", "Social", "Governance", "Total"], rows };
}

export async function buildReport(type: "environmental" | "social" | "governance" | "esg-summary", filters: Filters): Promise<ReportResult> {
  if (type === "environmental") return buildEnvironmentalReport(filters);
  if (type === "social") return buildSocialReport(filters);
  if (type === "governance") return buildGovernanceReport(filters);
  return buildEsgSummaryReport(filters);
}
