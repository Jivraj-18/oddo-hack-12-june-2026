import cron from "node-cron";
import { prisma } from "../db/prisma.js";

function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

async function computeEnvironmentalScore(departmentId: string): Promise<number> {
  const goals = await prisma.environmentalGoal.findMany({ where: { departmentId } });
  if (goals.length === 0) return 50;
  const ratios = goals.map((g) => {
    const target = Number(g.targetCo2);
    const current = Number(g.currentCo2);
    if (target <= 0) return 100;
    const progress = Math.max(0, Math.min(1, 1 - current / target));
    return progress * 100;
  });
  return ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
}

async function computeSocialScore(departmentId: string): Promise<number> {
  const users = await prisma.user.findMany({ where: { departmentId }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return 50;

  const [participations, diversity] = await Promise.all([
    prisma.employeeParticipation.findMany({ where: { userId: { in: userIds } } }),
    prisma.diversityMetric.findFirst({ where: { departmentId }, orderBy: { period: "desc" } }),
  ]);

  const total = participations.length;
  const approved = participations.filter((p) => p.approvalStatus === "approved").length;
  const participationRate = total > 0 ? (approved / total) * 100 : 50;
  const trainingRate = diversity ? Number(diversity.trainingCompletionPct) : 50;

  return participationRate * 0.5 + trainingRate * 0.5;
}

async function computeGovernanceScore(departmentId: string): Promise<number> {
  const [users, issues] = await Promise.all([
    prisma.user.findMany({ where: { departmentId }, select: { id: true } }),
    prisma.complianceIssue.findMany({ where: { departmentId } }),
  ]);
  const userIds = users.map((u) => u.id);

  const acknowledgements = userIds.length
    ? await prisma.policyAcknowledgement.count({ where: { userId: { in: userIds } } })
    : 0;
  const totalPolicies = await prisma.esgPolicy.count({ where: { status: "active" } });
  const ackPct = totalPolicies > 0 && userIds.length > 0 ? (acknowledgements / (totalPolicies * userIds.length)) * 100 : 50;

  const severityWeight = { low: 5, medium: 10, high: 20 } as const;
  const openPenalty = issues
    .filter((i) => i.status !== "resolved")
    .reduce((sum, i) => sum + severityWeight[i.severity], 0);

  return Math.max(0, Math.min(100, ackPct * 0.6 - openPenalty * 0.4 + 40));
}

export async function recomputeDepartmentScores(): Promise<number> {
  const departments = await prisma.department.findMany();
  const config = await prisma.esgConfig.findFirst();
  const weightEnv = config ? Number(config.weightEnv) : 0.4;
  const weightSocial = config ? Number(config.weightSocial) : 0.3;
  const weightGov = config ? Number(config.weightGov) : 0.3;
  const period = currentPeriod();

  for (const dept of departments) {
    const [environmentalScore, socialScore, governanceScore] = await Promise.all([
      computeEnvironmentalScore(dept.id),
      computeSocialScore(dept.id),
      computeGovernanceScore(dept.id),
    ]);
    const totalScore = environmentalScore * weightEnv + socialScore * weightSocial + governanceScore * weightGov;

    await prisma.departmentScore.upsert({
      where: { departmentId_period: { departmentId: dept.id, period } },
      create: { departmentId: dept.id, period, environmentalScore, socialScore, governanceScore, totalScore },
      update: { environmentalScore, socialScore, governanceScore, totalScore, computedAt: new Date() },
    });
  }

  return departments.length;
}

export function startScoringJob() {
  cron.schedule("30 * * * *", () => {
    recomputeDepartmentScores().catch((err) => console.error("scoring job failed", err));
  });
}
