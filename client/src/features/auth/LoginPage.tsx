import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";
import { getApiErrorMessage, getApiFieldErrors } from "../../lib/api-client";
import "./login-page.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(getApiErrorMessage(err));
      setFieldErrors(getApiFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page" id="login-page">
      <form className="login-page__card" id="login-form" onSubmit={handleSubmit} noValidate>
        <h1>EcoSphere</h1>
        <p className="login-page__subtitle">Sign in to your ESG dashboard</p>

        {formError && (
          <p className="login-page__error" role="alert">
            {formError}
          </p>
        )}

        <label className="login-page__field" htmlFor="email">
          Email
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {fieldErrors.email && <span className="login-page__field-error">{fieldErrors.email}</span>}
        </label>

        <label className="login-page__field" htmlFor="password">
          Password
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {fieldErrors.password && <span className="login-page__field-error">{fieldErrors.password}</span>}
        </label>

        <button type="submit" className="login-page__submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
