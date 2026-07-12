import { useEffect, useState, type FormEvent } from "react";
import { apiClient, getApiErrorMessage, getApiFieldErrors } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import "./governance-page.css";

interface Department {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
}

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
  status: "open" | "in_progress" | "resolved";
  dueDate: string;
  isOverdue: boolean;
  department?: { name: string };
  owner?: { name: string };
}

const TABS = ["Policies", "Audits", "Compliance Issues"] as const;
type Tab = (typeof TABS)[number];

export function GovernancePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("Policies");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const isManager = user?.role === "admin" || user?.role === "manager";
  const isAdmin = user?.role === "admin";

  function loadAll() {
    apiClient.get<Policy[]>("/policies").then((res) => setPolicies(res.data)).catch(() => {});
    apiClient.get<Audit[]>("/audits").then((res) => setAudits(res.data)).catch(() => {});
    apiClient.get<ComplianceIssue[]>("/compliance-issues").then((res) => setIssues(res.data)).catch(() => {});
    apiClient.get<Department[]>("/departments").then((res) => setDepartments(res.data)).catch(() => {});
    if (isManager) {
      apiClient.get<UserOption[]>("/users").then((res) => setUsers(res.data)).catch(() => {});
    }
  }

  useEffect(loadAll, [isManager]);

  async function handleAcknowledge(policyId: string) {
    setMessage(null);
    try {
      await apiClient.post(`/policies/${policyId}/acknowledge`);
      setMessage("Policy acknowledged.");
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    }
  }

  async function handleIssueStatusChange(issueId: string, status: ComplianceIssue["status"]) {
    try {
      await apiClient.patch(`/compliance-issues/${issueId}`, { status });
      loadAll();
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
        <>
          {isAdmin && <CreatePolicyForm onCreated={loadAll} />}
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
        </>
      )}

      {tab === "Audits" && (
        <>
          {isManager && <CreateAuditForm departments={departments} onCreated={loadAll} />}
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
        </>
      )}

      {tab === "Compliance Issues" && (
        <>
          {isManager && <CreateComplianceIssueForm audits={audits} departments={departments} users={users} onCreated={loadAll} />}
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
                    {isManager ? (
                      <select
                        value={issue.status}
                        onChange={(e) => handleIssueStatusChange(issue.id, e.target.value as ComplianceIssue["status"])}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    ) : (
                      issue.status.replace("_", " ")
                    )}
                    {issue.isOverdue && <span className="governance-page__overdue-flag">Overdue</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function CreatePolicyForm({ onCreated }: { onCreated: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [body, setBody] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await apiClient.post("/policies", { title, version, effectiveDate, body: body || undefined });
      setTitle("");
      setVersion("");
      setEffectiveDate("");
      setBody("");
      setShowForm(false);
      onCreated();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
      setFieldErrors(getApiFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="governance-page__create">
      <button type="button" className="governance-page__add-btn" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Create policy"}
      </button>
      {showForm && (
        <form className="governance-page__form" onSubmit={handleSubmit} noValidate>
          {formError && <p className="governance-page__form-error">{formError}</p>}
          <label htmlFor="policy-title">
            Title
            <input id="policy-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            {fieldErrors.title && <span className="governance-page__field-error">{fieldErrors.title}</span>}
          </label>
          <label htmlFor="policy-version">
            Version
            <input id="policy-version" value={version} onChange={(e) => setVersion(e.target.value)} required />
            {fieldErrors.version && <span className="governance-page__field-error">{fieldErrors.version}</span>}
          </label>
          <label htmlFor="policy-effective">
            Effective date
            <input id="policy-effective" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required />
            {fieldErrors.effectiveDate && <span className="governance-page__field-error">{fieldErrors.effectiveDate}</span>}
          </label>
          <label htmlFor="policy-body">
            Body (optional)
            <input id="policy-body" value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <button type="submit" className="governance-page__submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save policy"}
          </button>
        </form>
      )}
    </div>
  );
}

function CreateAuditForm({ departments, onCreated }: { departments: Department[]; onCreated: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [auditorName, setAuditorName] = useState("");
  const [auditDate, setAuditDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await apiClient.post("/audits", { title, departmentId, auditorName, auditDate });
      setTitle("");
      setDepartmentId("");
      setAuditorName("");
      setAuditDate("");
      setShowForm(false);
      onCreated();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
      setFieldErrors(getApiFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="governance-page__create">
      <button type="button" className="governance-page__add-btn" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Create audit"}
      </button>
      {showForm && (
        <form className="governance-page__form" onSubmit={handleSubmit} noValidate>
          {formError && <p className="governance-page__form-error">{formError}</p>}
          <label htmlFor="audit-title">
            Title
            <input id="audit-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            {fieldErrors.title && <span className="governance-page__field-error">{fieldErrors.title}</span>}
          </label>
          <label htmlFor="audit-department">
            Department
            <select id="audit-department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {fieldErrors.departmentId && <span className="governance-page__field-error">{fieldErrors.departmentId}</span>}
          </label>
          <label htmlFor="audit-auditor">
            Auditor name
            <input id="audit-auditor" value={auditorName} onChange={(e) => setAuditorName(e.target.value)} required />
            {fieldErrors.auditorName && <span className="governance-page__field-error">{fieldErrors.auditorName}</span>}
          </label>
          <label htmlFor="audit-date">
            Audit date
            <input id="audit-date" type="date" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} required />
            {fieldErrors.auditDate && <span className="governance-page__field-error">{fieldErrors.auditDate}</span>}
          </label>
          <button type="submit" className="governance-page__submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save audit"}
          </button>
        </form>
      )}
    </div>
  );
}

function CreateComplianceIssueForm({
  audits,
  departments,
  users,
  onCreated,
}: {
  audits: Audit[];
  departments: Department[];
  users: UserOption[];
  onCreated: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [auditId, setAuditId] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("low");
  const [departmentId, setDepartmentId] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await apiClient.post(`/audits/${auditId}/issues`, { description, severity, departmentId, ownerUserId, dueDate });
      setDescription("");
      setSeverity("low");
      setDepartmentId("");
      setOwnerUserId("");
      setDueDate("");
      setShowForm(false);
      onCreated();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
      setFieldErrors(getApiFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="governance-page__create">
      <button type="button" className="governance-page__add-btn" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Create compliance issue"}
      </button>
      {showForm && (
        <form className="governance-page__form" onSubmit={handleSubmit} noValidate>
          {formError && <p className="governance-page__form-error">{formError}</p>}
          <label htmlFor="issue-audit">
            Audit
            <select id="issue-audit" value={auditId} onChange={(e) => setAuditId(e.target.value)} required>
              <option value="">Select audit</option>
              {audits.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="issue-description">
            Description
            <input id="issue-description" value={description} onChange={(e) => setDescription(e.target.value)} required />
            {fieldErrors.description && <span className="governance-page__field-error">{fieldErrors.description}</span>}
          </label>
          <label htmlFor="issue-severity">
            Severity
            <select id="issue-severity" value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label htmlFor="issue-department">
            Department
            <select id="issue-department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {fieldErrors.departmentId && <span className="governance-page__field-error">{fieldErrors.departmentId}</span>}
          </label>
          <label htmlFor="issue-owner">
            Owner
            <select id="issue-owner" value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)} required>
              <option value="">Select owner</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {fieldErrors.ownerUserId && <span className="governance-page__field-error">{fieldErrors.ownerUserId}</span>}
          </label>
          <label htmlFor="issue-due">
            Due date
            <input id="issue-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            {fieldErrors.dueDate && <span className="governance-page__field-error">{fieldErrors.dueDate}</span>}
          </label>
          <button type="submit" className="governance-page__submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save issue"}
          </button>
        </form>
      )}
    </div>
  );
}
