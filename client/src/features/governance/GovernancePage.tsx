import { useEffect, useState } from "react";
import { apiClient, getApiErrorMessage } from "../../lib/api-client";
import "./governance-page.css";

interface Policy {
  id: string;
  title: string;
  version: string;
  effectiveDate: string;
  status: string;
}

interface Audit {
  id: string;
  title: string;
  auditorName: string;
  auditDate: string;
  status: string;
  department: { name: string };
  issues: ComplianceIssue[];
}

interface ComplianceIssue {
  id: string;
  description: string;
  severity: "low" | "medium" | "high";
  status: string;
  dueDate: string;
  isOverdue: boolean;
  department?: { name: string };
  owner?: { name: string };
}

const TABS = ["Policies", "Audits", "Compliance Issues"] as const;
type Tab = (typeof TABS)[number];

export function GovernancePage() {
  const [tab, setTab] = useState<Tab>("Policies");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  function loadAll() {
    apiClient.get<Policy[]>("/policies").then((res) => setPolicies(res.data)).catch(() => {});
    apiClient.get<Audit[]>("/audits").then((res) => setAudits(res.data)).catch(() => {});
    apiClient.get<ComplianceIssue[]>("/compliance-issues").then((res) => setIssues(res.data)).catch(() => {});
  }

  useEffect(loadAll, []);

  async function handleAcknowledge(policyId: string) {
    setMessage(null);
    try {
      await apiClient.post(`/policies/${policyId}/acknowledge`);
      setMessage("Policy acknowledged.");
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    }
  }

  return (
    <div className="governance-page" id="governance-page">
      <h1>Governance</h1>
      <div className="governance-page__tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={"governance-page__tab" + (tab === t ? " is-active" : "")}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {message && <p className="governance-page__message">{message}</p>}

      {tab === "Policies" && (
        <table className="governance-page__table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Version</th>
              <th>Effective date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.version}</td>
                <td>{new Date(p.effectiveDate).toLocaleDateString()}</td>
                <td>{p.status}</td>
                <td>
                  <button type="button" className="governance-page__ack-btn" onClick={() => handleAcknowledge(p.id)}>
                    Acknowledge
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "Audits" && (
        <table className="governance-page__table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Department</th>
              <th>Auditor</th>
              <th>Date</th>
              <th>Status</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            {audits.map((a) => (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td>{a.department.name}</td>
                <td>{a.auditorName}</td>
                <td>{new Date(a.auditDate).toLocaleDateString()}</td>
                <td>
                  <span className={`governance-page__status governance-page__status--${a.status}`}>{a.status.replace("_", " ")}</span>
                </td>
                <td>{a.issues.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "Compliance Issues" && (
        <table className="governance-page__table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Severity</th>
              <th>Department</th>
              <th>Owner</th>
              <th>Due date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id} className={issue.isOverdue ? "governance-page__row--overdue" : undefined}>
                <td>{issue.description}</td>
                <td>
                  <span className={`governance-page__severity governance-page__severity--${issue.severity}`}>{issue.severity}</span>
                </td>
                <td>{issue.department?.name}</td>
                <td>{issue.owner?.name}</td>
                <td>{new Date(issue.dueDate).toLocaleDateString()}</td>
                <td>
                  {issue.status.replace("_", " ")}
                  {issue.isOverdue && <span className="governance-page__overdue-flag">Overdue</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
