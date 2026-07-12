import { useEffect, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { apiClient } from "../../lib/api-client";
import "./dashboard-page.css";

interface DepartmentScore {
  id: string;
  department: { id: string; name: string };
  environmentalScore: string;
  socialScore: string;
  governanceScore: string;
  totalScore: string;
}

interface TrendPoint {
  period: string;
  _avg: { environmentalScore: string; socialScore: string; governanceScore: string; totalScore: string };
}

interface DashboardSummary {
  overallScore: number;
  departmentScores: DepartmentScore[];
  ranking: DepartmentScore[];
  trend: TrendPoint[];
  recentActivity: Array<{ id: string; co2e: string; createdAt: string; department: { name: string } }>;
}

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<DashboardSummary>("/dashboard/summary")
      .then((res) => setSummary(res.data))
      .catch(() => setError("Could not load dashboard data."));
  }, []);

  if (error) {
    return <p className="dashboard-page__error">{error}</p>;
  }

  if (!summary) {
    return <p className="dashboard-page__loading">Loading dashboard…</p>;
  }

  const trendData = summary.trend.map((t) => ({
    period: t.period,
    environmental: Number(t._avg.environmentalScore ?? 0),
    social: Number(t._avg.socialScore ?? 0),
    governance: Number(t._avg.governanceScore ?? 0),
  }));

  const rankingData = summary.ranking.map((r) => ({
    name: r.department.name,
    score: Number(r.totalScore),
  }));

  return (
    <div className="dashboard-page" id="dashboard-page">
      <h1>Dashboard</h1>

      <section className="dashboard-page__kpis" data-tour="esg-score">
        <KpiCard label="Overall ESG Score" value={summary.overallScore} />
        {summary.departmentScores[0] && (
          <>
            <KpiCard label="Environmental" value={Number(summary.departmentScores[0].environmentalScore)} tone="env" />
            <KpiCard label="Social" value={Number(summary.departmentScores[0].socialScore)} tone="social" />
            <KpiCard label="Governance" value={Number(summary.departmentScores[0].governanceScore)} tone="gov" />
          </>
        )}
      </section>

      <section className="dashboard-page__panel" data-tour="emissions-trend">
        <h2>12-month score trend</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="period" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Line type="monotone" dataKey="environmental" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="social" stroke="var(--color-secondary)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="governance" stroke="#5b7fa6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="dashboard-page__panel">
        <h2>Department ranking</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rankingData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis type="number" fontSize={12} />
            <YAxis type="category" dataKey="name" width={140} fontSize={12} />
            <Tooltip />
            <Bar dataKey="score" fill="var(--color-primary)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="dashboard-page__panel">
        <h2>Recent activity</h2>
        <table className="dashboard-page__table">
          <thead>
            <tr>
              <th>Department</th>
              <th>CO2e (kg)</th>
              <th>Recorded</th>
            </tr>
          </thead>
          <tbody>
            {summary.recentActivity.map((row) => (
              <tr key={row.id}>
                <td>{row.department.name}</td>
                <td>{Number(row.co2e).toFixed(2)}</td>
                <td>{new Date(row.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function KpiCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className={"kpi-card" + (tone ? ` kpi-card--${tone}` : "")}>
      <span className="kpi-card__label">{label}</span>
      <span className="kpi-card__value">{value.toFixed(1)}</span>
    </div>
  );
}
