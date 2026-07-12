import { useEffect, useState } from "react";
import { apiClient, getApiErrorMessage, getApiFieldErrors } from "../../lib/api-client";
import "./environmental-page.css";

interface Department {
  id: string;
  name: string;
}

interface Goal {
  id: string;
  name: string;
  targetCo2: string;
  currentCo2: string;
  deadline: string;
  status: string;
  department: Department;
}

const TABS = ["Environmental Goals", "Emission Factors"] as const;
type Tab = (typeof TABS)[number];

export function EnvironmentalPage() {
  const [tab, setTab] = useState<Tab>("Environmental Goals");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [factors, setFactors] = useState<Array<{ id: string; name: string; activityType: string; unit: string; co2ePerUnit: string }>>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [targetCo2, setTargetCo2] = useState("");
  const [deadline, setDeadline] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function loadGoals() {
    apiClient.get<Goal[]>("/goals").then((res) => setGoals(res.data)).catch(() => setLoadError("Could not load goals."));
  }

  useEffect(() => {
    loadGoals();
    apiClient.get("/emission-factors").then((res) => setFactors(res.data)).catch(() => {});
    apiClient.get<Department[]>("/departments").then((res) => setDepartments(res.data)).catch(() => {});
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await apiClient.post("/goals", { name, departmentId, targetCo2, deadline });
      setName("");
      setDepartmentId("");
      setTargetCo2("");
      setDeadline("");
      setShowForm(false);
      loadGoals();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
      setFieldErrors(getApiFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="environmental-page" id="environmental-page">
      <h1>Environmental</h1>
      <div className="environmental-page__tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={"environmental-page__tab" + (tab === t ? " is-active" : "")}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {loadError && <p className="environmental-page__error">{loadError}</p>}

      {tab === "Environmental Goals" && (
        <section>
          <div className="environmental-page__toolbar">
            <button type="button" className="environmental-page__add-btn" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Cancel" : "Add goal"}
            </button>
          </div>

          {showForm && (
            <form className="environmental-page__form" id="goal-form" onSubmit={handleSubmit} noValidate>
              {formError && <p className="environmental-page__form-error">{formError}</p>}
              <label htmlFor="goal-name">
                Name
                <input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} required />
                {fieldErrors.name && <span className="environmental-page__field-error">{fieldErrors.name}</span>}
              </label>
              <label htmlFor="goal-department">
                Department
                <select id="goal-department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.departmentId && <span className="environmental-page__field-error">{fieldErrors.departmentId}</span>}
              </label>
              <label htmlFor="goal-target">
                Target CO2 (kg)
                <input id="goal-target" type="number" min="0" step="0.01" value={targetCo2} onChange={(e) => setTargetCo2(e.target.value)} required />
                {fieldErrors.targetCo2 && <span className="environmental-page__field-error">{fieldErrors.targetCo2}</span>}
              </label>
              <label htmlFor="goal-deadline">
                Deadline
                <input id="goal-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
                {fieldErrors.deadline && <span className="environmental-page__field-error">{fieldErrors.deadline}</span>}
              </label>
              <button type="submit" className="environmental-page__submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save goal"}
              </button>
            </form>
          )}

          <table className="environmental-page__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Target CO2</th>
                <th>Current CO2</th>
                <th>Progress</th>
                <th>Deadline</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {goals.length === 0 && (
                <tr>
                  <td colSpan={7} className="environmental-page__empty">
                    No goals yet — create one.
                  </td>
                </tr>
              )}
              {goals.map((goal) => {
                const target = Number(goal.targetCo2);
                const current = Number(goal.currentCo2);
                const progress = target > 0 ? Math.max(0, Math.min(100, ((target - current) / target) * 100)) : 0;
                return (
                  <tr key={goal.id}>
                    <td>{goal.name}</td>
                    <td>{goal.department.name}</td>
                    <td>{target.toFixed(2)}</td>
                    <td>{current.toFixed(2)}</td>
                    <td>
                      <div className="environmental-page__progress">
                        <div className="environmental-page__progress-bar" style={{ width: `${progress}%` }} />
                      </div>
                    </td>
                    <td>{new Date(goal.deadline).toLocaleDateString()}</td>
                    <td>
                      <span className={`environmental-page__status environmental-page__status--${goal.status}`}>{goal.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {tab === "Emission Factors" && (
        <section>
          <table className="environmental-page__table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Activity type</th>
                <th>Unit</th>
                <th>CO2e per unit</th>
              </tr>
            </thead>
            <tbody>
              {factors.map((f) => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td>{f.activityType}</td>
                  <td>{f.unit}</td>
                  <td>{Number(f.co2ePerUnit).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
