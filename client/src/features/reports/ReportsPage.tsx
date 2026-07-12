import { useEffect, useState } from "react";
import { apiClient, getApiErrorMessage } from "../../lib/api-client";
import "./reports-page.css";

type ReportType = "environmental" | "social" | "governance" | "esg-summary";
type Format = "pdf" | "excel" | "csv";

interface ReportResult {
  title: string;
  columns: string[];
  rows: Array<Record<string, string | number>>;
}

interface Department {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface Challenge {
  id: string;
  title: string;
}

const REPORT_TYPES: Array<{ value: ReportType; label: string }> = [
  { value: "environmental", label: "Environmental" },
  { value: "social", label: "Social" },
  { value: "governance", label: "Governance" },
  { value: "esg-summary", label: "ESG Summary" },
];

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("esg-summary");
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<Format | null>(null);

  useEffect(() => {
    apiClient.get<Department[]>("/departments").then((res) => setDepartments(res.data)).catch(() => {});
    apiClient.get<UserOption[]>("/users").then((res) => setUsers(res.data)).catch(() => {});
    apiClient.get<Category[]>("/categories").then((res) => setCategories(res.data)).catch(() => {});
    apiClient.get<Challenge[]>("/challenges").then((res) => setChallenges(res.data)).catch(() => {});
  }, []);

  function buildFilters() {
    return {
      ...(departmentId ? { department: departmentId } : {}),
      ...(employeeId ? { employee: employeeId } : {}),
      ...(challengeId ? { challenge: challengeId } : {}),
      ...(categoryId ? { category: categoryId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    };
  }

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<ReportResult>(`/reports/${reportType}`, { params: buildFilters() });
      setResult(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: Format) {
    setExporting(format);
    setError(null);
    try {
      const response = await apiClient.post(
        "/reports/custom",
        { reportType, format, ...buildFilters() },
        { responseType: "blob" }
      );
      const extension = format === "excel" ? "xlsx" : format;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportType}-report.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="reports-page" id="reports-page">
      <h1>Reports</h1>

      <section className="reports-page__builder">
        <label htmlFor="report-type">
          Module
          <select id="report-type" value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="report-department">
          Department
          <select id="report-department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="report-employee">
          Employee
          <select id="report-employee" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            <option value="">All employees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="report-category">
          ESG Category
          <select id="report-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="report-challenge">
          Challenge
          <select id="report-challenge" value={challengeId} onChange={(e) => setChallengeId(e.target.value)}>
            <option value="">All challenges</option>
            {challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="report-from">
          From
          <input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label htmlFor="report-to">
          To
          <input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button type="button" className="reports-page__run-btn" onClick={handleRun} disabled={loading}>
          {loading ? "Running…" : "Run report"}
        </button>
      </section>

      {error && <p className="reports-page__error">{error}</p>}

      {result && (
        <section className="reports-page__result">
          <div className="reports-page__result-header">
            <h2>{result.title}</h2>
            <div className="reports-page__export-actions">
              <button type="button" onClick={() => handleExport("pdf")} disabled={exporting !== null}>
                {exporting === "pdf" ? "Exporting…" : "Export PDF"}
              </button>
              <button type="button" onClick={() => handleExport("excel")} disabled={exporting !== null}>
                {exporting === "excel" ? "Exporting…" : "Export Excel"}
              </button>
              <button type="button" onClick={() => handleExport("csv")} disabled={exporting !== null}>
                {exporting === "csv" ? "Exporting…" : "Export CSV"}
              </button>
            </div>
          </div>

          <table className="reports-page__table">
            <thead>
              <tr>
                {result.columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.length === 0 && (
                <tr>
                  <td colSpan={result.columns.length} className="reports-page__empty">
                    No data for this filter.
                  </td>
                </tr>
              )}
              {result.rows.map((row, i) => (
                <tr key={i}>
                  {result.columns.map((col) => (
                    <td key={col}>{row[col]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
