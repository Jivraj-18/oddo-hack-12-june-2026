import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { prisma } from "../../db/prisma.js";
import { recomputeDepartmentScores } from "../../jobs/scoring.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.post("/recompute-scores", requireRole("admin"), async (_req, res) => {
  const count = await recomputeDepartmentScores();
  res.json({ departmentsUpdated: count });
});

dashboardRouter.get("/summary", async (_req, res) => {
  const latestPeriod = await prisma.departmentScore.findFirst({ orderBy: { period: "desc" }, select: { period: true } });

  const [scores, trend, recentTransactions] = await Promise.all([
    latestPeriod
      ? prisma.departmentScore.findMany({ where: { period: latestPeriod.period }, include: { department: true } })
      : [],
    prisma.departmentScore.groupBy({
      by: ["period"],
      _avg: { environmentalScore: true, socialScore: true, governanceScore: true, totalScore: true },
      orderBy: { period: "asc" },
    }),
    prisma.carbonTransaction.findMany({ take: 10, orderBy: { createdAt: "desc" }, include: { department: true } }),
  ]);

  const overall = scores.length
    ? scores.reduce((sum, s) => sum + Number(s.totalScore), 0) / scores.length
    : 0;

  const ranking = [...scores].sort((a, b) => Number(b.totalScore) - Number(a.totalScore));

  res.json({
    overallScore: overall,
    departmentScores: scores,
    ranking,
    trend,
    recentActivity: recentTransactions,
  });
});
