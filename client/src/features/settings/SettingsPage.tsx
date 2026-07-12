import { useEffect, useState } from "react";
import { apiClient, getApiErrorMessage, getApiFieldErrors } from "../../lib/api-client";
import "./settings-page.css";

interface EsgConfig {
  autoEmissionCalc: boolean;
  evidenceRequiredGlobal: boolean;
  badgeAutoAward: boolean;
  emailAlerts: boolean;
  weightEnv: string;
  weightSocial: string;
  weightGov: string;
}

export function SettingsPage() {
  const [config, setConfig] = useState<EsgConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiClient.get<EsgConfig>("/settings/esg-config").then((res) => setConfig(res.data));
  }, []);

  function updateField<K extends keyof EsgConfig>(key: K, value: EsgConfig[K]) {
    setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
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

  if (!config) {
    return <p className="settings-page__loading">Loading settings…</p>;
  }

  return (
    <div className="settings-page" id="settings-page">
      <h1>Settings</h1>

      <section className="settings-page__panel">
        <h2>ESG Configuration</h2>
        {message && <p className="settings-page__message">{message}</p>}

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
        <label className="settings-page__toggle">
          <input type="checkbox" checked={config.emailAlerts} onChange={(e) => updateField("emailAlerts", e.target.checked)} />
          Email alerts
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

        <button type="button" className="settings-page__save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </section>
    </div>
  );
}
