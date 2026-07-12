import { useEffect, useState, type FormEvent } from "react";
import { apiClient, getApiErrorMessage, getApiFieldErrors } from "../../lib/api-client";
import "./settings-page.css";

interface Department {
  id: string;
  name: string;
  code: string;
  status: string;
  head: { name: string } | null;
  parent: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
  type: "csr_activity" | "challenge";
  status: string;
}

interface EsgConfig {
  autoEmissionCalc: boolean;
  evidenceRequiredGlobal: boolean;
  badgeAutoAward: boolean;
  emailAlerts: boolean;
  weightEnv: string;
  weightSocial: string;
  weightGov: string;
}

const TABS = ["Departments", "Categories", "ESG Configuration", "Notification Settings"] as const;
type Tab = (typeof TABS)[number];

const NOTIFICATION_TYPES = [
  { label: "New compliance issue raised", type: "compliance_issue" },
  { label: "CSR / Challenge approval decisions", type: "approval_decision" },
  { label: "Policy acknowledgement reminders", type: "policy_reminder" },
  { label: "Badge unlocks", type: "badge_unlock" },
  { label: "Compliance issue overdue", type: "issue_overdue" },
];

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("ESG Configuration");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [config, setConfig] = useState<EsgConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function loadDepartments() {
    apiClient.get<Department[]>("/departments").then((res) => setDepartments(res.data)).catch(() => {});
  }

  function loadCategories() {
    apiClient.get<Category[]>("/categories").then((res) => setCategories(res.data)).catch(() => {});
  }

  useEffect(loadDepartments, []);
  useEffect(loadCategories, []);
  useEffect(() => {
    apiClient.get<EsgConfig>("/settings/esg-config").then((res) => setConfig(res.data));
  }, []);

  function updateField<K extends keyof EsgConfig>(key: K, value: EsgConfig[K]) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSaveConfig() {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    setFieldErrors({});
    try {
      const { data } = await apiClient.put("/settings/esg-config", {
        ...config,
        weightEnv: Number(config.weightEnv),
        weightSocial: Number(config.weightSocial),
        weightGov: Number(config.weightGov),
      });
      setConfig(data);
      setMessage("Settings saved.");
    } catch (err) {
      setMessage(getApiErrorMessage(err));
      setFieldErrors(getApiFieldErrors(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-page" id="settings-page">
      <h1>Settings</h1>
      <div className="settings-page__tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={"settings-page__tab" + (tab === t ? " is-active" : "")}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Departments" && <DepartmentsTab departments={departments} onChanged={loadDepartments} />}

      {tab === "Categories" && <CategoriesTab categories={categories} onChanged={loadCategories} />}

      {tab === "ESG Configuration" && (
        <section className="settings-page__panel">
          <h2>ESG Configuration</h2>
          {message && <p className="settings-page__message">{message}</p>}
          {!config ? (
            <p className="settings-page__loading">Loading settings…</p>
          ) : (
            <>
              <label className="settings-page__toggle">
                <input
                  type="checkbox"
                  checked={config.autoEmissionCalc}
                  onChange={(e) => updateField("autoEmissionCalc", e.target.checked)}
                />
                Auto emission calculation
              </label>
              <label className="settings-page__toggle">
                <input
                  type="checkbox"
                  checked={config.evidenceRequiredGlobal}
                  onChange={(e) => updateField("evidenceRequiredGlobal", e.target.checked)}
                />
                Evidence required for approvals
              </label>
              <label className="settings-page__toggle">
                <input
                  type="checkbox"
                  checked={config.badgeAutoAward}
                  onChange={(e) => updateField("badgeAutoAward", e.target.checked)}
                />
                Badge auto-award
              </label>

              <div className="settings-page__weights">
                <label>
                  Environmental weight
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={config.weightEnv}
                    onChange={(e) => updateField("weightEnv", e.target.value)}
                  />
                </label>
                <label>
                  Social weight
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={config.weightSocial}
                    onChange={(e) => updateField("weightSocial", e.target.value)}
                  />
                </label>
                <label>
                  Governance weight
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={config.weightGov}
                    onChange={(e) => updateField("weightGov", e.target.value)}
                  />
                </label>
              </div>
              {fieldErrors.weightEnv && <p className="settings-page__field-error">{fieldErrors.weightEnv}</p>}

              <button type="button" className="settings-page__save-btn" onClick={handleSaveConfig} disabled={saving}>
                {saving ? "Saving…" : "Save settings"}
              </button>
            </>
          )}
        </section>
      )}

      {tab === "Notification Settings" && config && (
        <section className="settings-page__panel">
          <h2>Notification Settings</h2>
          {message && <p className="settings-page__message">{message}</p>}
          <label className="settings-page__toggle">
            <input type="checkbox" checked={config.emailAlerts} onChange={(e) => updateField("emailAlerts", e.target.checked)} />
            Send email alerts in addition to in-app notifications
          </label>
          <p className="settings-page__notification-note">
            In-app notifications always fire for the events below. Email alerts, when enabled, are sent for the same events.
          </p>
          <ul className="settings-page__notification-list">
            {NOTIFICATION_TYPES.map((n) => (
              <li key={n.type}>{n.label}</li>
            ))}
          </ul>
          <button type="button" className="settings-page__save-btn" onClick={handleSaveConfig} disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </section>
      )}
    </div>
  );
}

function DepartmentsTab({ departments, onChanged }: { departments: Department[]; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await apiClient.post("/departments", { name, code });
      setName("");
      setCode("");
      setShowForm(false);
      onChanged();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
      setFieldErrors(getApiFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="settings-page__panel">
      <h2>Departments</h2>
      <button type="button" className="settings-page__add-btn" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Add department"}
      </button>
      {showForm && (
        <form className="settings-page__form" onSubmit={handleSubmit} noValidate>
          {formError && <p className="settings-page__field-error">{formError}</p>}
          <label htmlFor="dept-name">
            Name
            <input id="dept-name" value={name} onChange={(e) => setName(e.target.value)} required />
            {fieldErrors.name && <span className="settings-page__field-error">{fieldErrors.name}</span>}
          </label>
          <label htmlFor="dept-code">
            Code
            <input id="dept-code" value={code} onChange={(e) => setCode(e.target.value)} required />
            {fieldErrors.code && <span className="settings-page__field-error">{fieldErrors.code}</span>}
          </label>
          <button type="submit" className="settings-page__save-btn" disabled={submitting}>
            {submitting ? "Saving…" : "Save department"}
          </button>
        </form>
      )}
      <table className="settings-page__table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Head</th>
            <th>Parent</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.id}>
              <td>{d.name}</td>
              <td>{d.code}</td>
              <td>{d.head?.name ?? "—"}</td>
              <td>{d.parent?.name ?? "—"}</td>
              <td>{d.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CategoriesTab({ categories, onChanged }: { categories: Category[]; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"csr_activity" | "challenge">("csr_activity");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await apiClient.post("/categories", { name, type });
      setName("");
      setShowForm(false);
      onChanged();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
      setFieldErrors(getApiFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="settings-page__panel">
      <h2>Categories</h2>
      <button type="button" className="settings-page__add-btn" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Add category"}
      </button>
      {showForm && (
        <form className="settings-page__form" onSubmit={handleSubmit} noValidate>
          {formError && <p className="settings-page__field-error">{formError}</p>}
          <label htmlFor="cat-name">
            Name
            <input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} required />
            {fieldErrors.name && <span className="settings-page__field-error">{fieldErrors.name}</span>}
          </label>
          <label htmlFor="cat-type">
            Type
            <select id="cat-type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="csr_activity">CSR Activity</option>
              <option value="challenge">Challenge</option>
            </select>
          </label>
          <button type="submit" className="settings-page__save-btn" disabled={submitting}>
            {submitting ? "Saving…" : "Save category"}
          </button>
        </form>
      )}
      <table className="settings-page__table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.type === "csr_activity" ? "CSR Activity" : "Challenge"}</td>
              <td>{c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
