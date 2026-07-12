import { useEffect, useState } from "react";
import { apiClient, getApiErrorMessage } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import "./social-page.css";

interface CsrActivity {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  evidenceRequired: boolean;
  points: number;
  status: "open" | "closed";
  category: { name: string };
  _count: { participations: number };
}

const TABS = ["CSR Activities"] as const;

export function SocialPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<CsrActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    apiClient
      .get<CsrActivity[]>("/csr-activities")
      .then((res) => setActivities(res.data))
      .catch(() => setError("Could not load CSR activities."));
  }

  useEffect(load, []);

  async function handleJoin(activityId: string) {
    setJoiningId(activityId);
    setMessage(null);
    try {
      await apiClient.post(`/csr-activities/${activityId}/join`, {});
      setJoinedIds((prev) => new Set(prev).add(activityId));
      setMessage("You have joined this activity.");
      load();
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="social-page" id="social-page">
      <h1>Social</h1>
      <div className="social-page__tabs" role="tablist">
        {TABS.map((t) => (
          <span key={t} className="social-page__tab is-active">
            {t}
          </span>
        ))}
      </div>

      {error && <p className="social-page__error">{error}</p>}
      {message && <p className="social-page__message">{message}</p>}

      <div className="social-page__grid">
        {activities.length === 0 && !error && <p className="social-page__empty">No CSR activities yet — create one.</p>}
        {activities.map((activity) => (
          <article key={activity.id} className="csr-card" id={`csr-card-${activity.id}`}>
            <div className="csr-card__header">
              <h3>{activity.title}</h3>
              <span className={`csr-card__status csr-card__status--${activity.status}`}>{activity.status}</span>
            </div>
            <p className="csr-card__category">{activity.category.name}</p>
            <p className="csr-card__description">{activity.description}</p>
            <dl className="csr-card__meta">
              <div>
                <dt>Date</dt>
                <dd>{new Date(activity.eventDate).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{activity.location}</dd>
              </div>
              <div>
                <dt>Points</dt>
                <dd>{activity.points}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{activity._count.participations}</dd>
              </div>
            </dl>
            {activity.evidenceRequired && <p className="csr-card__evidence">Proof of participation required</p>}
            {user?.role === "employee" && (
              <button
                type="button"
                className="csr-card__join-btn"
                disabled={activity.status === "closed" || joiningId === activity.id || joinedIds.has(activity.id)}
                onClick={() => handleJoin(activity.id)}
              >
                {joinedIds.has(activity.id) ? "Joined" : joiningId === activity.id ? "Joining…" : "Join activity"}
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
