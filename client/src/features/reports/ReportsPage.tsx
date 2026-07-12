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

const REPORT_TYPES: Array<{ value: ReportType; label: string }> = [
  { value: "environmental", label: "Environmental" },
  { value: "social", label: "Social" },
  { value: "governance", label: "Governance" },
  { value: "esg-summary", label: "ESG Summary" },
];

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("esg-summary");
  const [departmentId, setDepartmentId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<Format | null>(null);

  useEffect(() => {
    apiClient.get<Department[]>("/departments").then((res) => setDepartments(res.data)).catch(() => {});
  }, []);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<ReportResult>(`/reports/${reportType}`, {
        params: departmentId ? { department: departmentId } : {},
      });
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
        { reportType, format, ...(departmentId ? { department: departmentId } : {}) },
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
          Report type
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
