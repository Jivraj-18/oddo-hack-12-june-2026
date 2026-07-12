import { useEffect, useState, type FormEvent } from "react";
import { apiClient, getApiErrorMessage, getApiFieldErrors } from "../../lib/api-client";
import "./environmental-page.css";

interface Department {
  id: string;
  name: string;
}

interface EmissionFactor {
  id: string;
  name: string;
  activityType: string;
  unit: string;
  co2ePerUnit: string;
}

interface ProductEsgProfile {
  id: string;
  productName: string;
  sku: string;
  recyclable: boolean;
  esgRating: string | null;
  emissionFactor: { name: string } | null;
}

interface CarbonTransaction {
  id: string;
  quantity: string;
  co2e: string;
  source: "auto" | "manual";
  createdAt: string;
  department: { name: string };
  emissionFactor: { name: string; unit: string };
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

const ACTIVITY_TYPES = ["purchase", "manufacturing", "expense", "fleet"] as const;

const TABS = ["Emission Factors", "Product ESG Profiles", "Carbon Transactions", "Environmental Goals"] as const;
type Tab = (typeof TABS)[number];

export function EnvironmentalPage() {
  const [tab, setTab] = useState<Tab>("Environmental Goals");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [products, setProducts] = useState<ProductEsgProfile[]>([]);
  const [transactions, setTransactions] = useState<CarbonTransaction[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showGoalForm, setShowGoalForm] = useState(false);
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

  function loadFactors() {
    apiClient.get<EmissionFactor[]>("/emission-factors").then((res) => setFactors(res.data)).catch(() => {});
  }

  function loadTransactions() {
    apiClient
      .get<{ items: CarbonTransaction[] }>("/carbon-transactions")
      .then((res) => setTransactions(res.data.items))
      .catch(() => {});
  }

  useEffect(loadGoals, []);
  useEffect(loadFactors, []);
  useEffect(() => {
    apiClient.get<ProductEsgProfile[]>("/product-esg-profiles").then((res) => setProducts(res.data)).catch(() => {});
  }, []);
  useEffect(loadTransactions, []);
  useEffect(() => {
    apiClient.get<Department[]>("/departments").then((res) => setDepartments(res.data)).catch(() => {});
  }, []);

  async function handleSubmit(event: FormEvent) {
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
      setShowGoalForm(false);
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
            <button type="button" className="environmental-page__add-btn" onClick={() => setShowGoalForm((v) => !v)}>
              {showGoalForm ? "Cancel" : "Add goal"}
            </button>
          </div>

          {showGoalForm && (
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
          <CreateEmissionFactorForm onCreated={loadFactors} />
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

      {tab === "Product ESG Profiles" && (
        <table className="environmental-page__table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Recyclable</th>
              <th>ESG rating</th>
              <th>Emission factor</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={5} className="environmental-page__empty">
                  No product ESG profiles yet.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.productName}</td>
                <td>{p.sku}</td>
                <td>{p.recyclable ? "Yes" : "No"}</td>
                <td>{p.esgRating ?? "—"}</td>
                <td>{p.emissionFactor?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "Carbon Transactions" && (
        <section>
          <LogCarbonDataForm departments={departments} factors={factors} onCreated={loadTransactions} />
          <table className="environmental-page__table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Emission factor</th>
                <th>Quantity</th>
                <th>CO2e (kg)</th>
                <th>Source</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="environmental-page__empty">
                    No carbon transactions recorded yet.
                  </td>
                </tr>
              )}
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.department.name}</td>
                  <td>{t.emissionFactor.name}</td>
                  <td>
                    {Number(t.quantity).toFixed(2)} {t.emissionFactor.unit}
                  </td>
                  <td>{Number(t.co2e).toFixed(2)}</td>
                  <td>
                    <span className={`environmental-page__source environmental-page__source--${t.source}`}>{t.source}</span>
                  </td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function CreateEmissionFactorForm({ onCreated }: { onCreated: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [activityType, setActivityType] = useState<(typeof ACTIVITY_TYPES)[number]>("purchase");
  const [unit, setUnit] = useState("");
  const [co2ePerUnit, setCo2ePerUnit] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await apiClient.post("/emission-factors", { name, activityType, unit, co2ePerUnit, effectiveFrom });
      setName("");
      setUnit("");
      setCo2ePerUnit("");
      setEffectiveFrom("");
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
    <div className="environmental-page__toolbar">
      <button type="button" className="environmental-page__add-btn" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Add emission factor"}
      </button>
      {showForm && (
        <form className="environmental-page__form" onSubmit={handleSubmit} noValidate>
          {formError && <p className="environmental-page__form-error">{formError}</p>}
          <label htmlFor="factor-name">
            Name
            <input id="factor-name" value={name} onChange={(e) => setName(e.target.value)} required />
            {fieldErrors.name && <span className="environmental-page__field-error">{fieldErrors.name}</span>}
          </label>
          <label htmlFor="factor-type">
            Activity type
            <select id="factor-type" value={activityType} onChange={(e) => setActivityType(e.target.value as typeof activityType)}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="factor-unit">
            Unit
            <input id="factor-unit" value={unit} onChange={(e) => setUnit(e.target.value)} required />
            {fieldErrors.unit && <span className="environmental-page__field-error">{fieldErrors.unit}</span>}
          </label>
          <label htmlFor="factor-co2e">
            CO2e per unit
            <input id="factor-co2e" type="number" min="0" step="0.0001" value={co2ePerUnit} onChange={(e) => setCo2ePerUnit(e.target.value)} required />
            {fieldErrors.co2ePerUnit && <span className="environmental-page__field-error">{fieldErrors.co2ePerUnit}</span>}
          </label>
          <label htmlFor="factor-effective">
            Effective from
            <input id="factor-effective" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
            {fieldErrors.effectiveFrom && <span className="environmental-page__field-error">{fieldErrors.effectiveFrom}</span>}
          </label>
          <button type="submit" className="environmental-page__submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save factor"}
          </button>
        </form>
      )}
    </div>
  );
}

function LogCarbonDataForm({
  departments,
  factors,
  onCreated,
}: {
  departments: Department[];
  factors: EmissionFactor[];
  onCreated: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<(typeof ACTIVITY_TYPES)[number]>("purchase");
  const [referenceNo, setReferenceNo] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [emissionFactorId, setEmissionFactorId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await apiClient.post("/erp-operations", {
        type,
        referenceNo,
        departmentId,
        emissionFactorId: emissionFactorId || undefined,
        quantity,
        unit,
        occurredAt,
      });
      setReferenceNo("");
      setDepartmentId("");
      setEmissionFactorId("");
      setQuantity("");
      setUnit("");
      setOccurredAt("");
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
    <div className="environmental-page__toolbar">
      <button type="button" className="environmental-page__add-btn" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Log carbon data"}
      </button>
      {showForm && (
        <form className="environmental-page__form" onSubmit={handleSubmit} noValidate>
          {formError && <p className="environmental-page__form-error">{formError}</p>}
          <label htmlFor="erp-type">
            Type
            <select id="erp-type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="erp-reference">
            Reference no.
            <input id="erp-reference" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} required />
            {fieldErrors.referenceNo && <span className="environmental-page__field-error">{fieldErrors.referenceNo}</span>}
          </label>
          <label htmlFor="erp-department">
            Department
            <select id="erp-department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {fieldErrors.departmentId && <span className="environmental-page__field-error">{fieldErrors.departmentId}</span>}
          </label>
          <label htmlFor="erp-factor">
            Emission factor
            <select id="erp-factor" value={emissionFactorId} onChange={(e) => setEmissionFactorId(e.target.value)} required>
              <option value="">Select factor</option>
              {factors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {fieldErrors.emissionFactorId && <span className="environmental-page__field-error">{fieldErrors.emissionFactorId}</span>}
          </label>
          <label htmlFor="erp-quantity">
            Quantity
            <input id="erp-quantity" type="number" min="0" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            {fieldErrors.quantity && <span className="environmental-page__field-error">{fieldErrors.quantity}</span>}
          </label>
          <label htmlFor="erp-unit">
            Unit
            <input id="erp-unit" value={unit} onChange={(e) => setUnit(e.target.value)} required />
            {fieldErrors.unit && <span className="environmental-page__field-error">{fieldErrors.unit}</span>}
          </label>
          <label htmlFor="erp-occurred">
            Occurred at
            <input id="erp-occurred" type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} required />
            {fieldErrors.occurredAt && <span className="environmental-page__field-error">{fieldErrors.occurredAt}</span>}
          </label>
          <button type="submit" className="environmental-page__submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save entry"}
          </button>
        </form>
      )}
    </div>
  );
}
