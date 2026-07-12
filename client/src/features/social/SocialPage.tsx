import { useEffect, useState } from "react";
import { apiClient, getApiErrorMessage } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { uploadProofFile } from "../../lib/uploads";
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
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  function load() {
    apiClient
      .get<CsrActivity[]>("/csr-activities")
      .then((res) => setActivities(res.data))
      .catch(() => setError("Could not load CSR activities."));
  }

  useEffect(load, []);

  function handleJoined(activityId: string) {
    setJoinedIds((prev) => new Set(prev).add(activityId));
    load();
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

      <div className="social-page__grid">
        {activities.length === 0 && !error && <p className="social-page__empty">No CSR activities yet — create one.</p>}
        {activities.map((activity) => (
          <CsrActivityCard
            key={activity.id}
            activity={activity}
            canJoin={user?.role === "employee"}
            joined={joinedIds.has(activity.id)}
            onJoined={() => handleJoined(activity.id)}
          />
        ))}
      </div>
    </div>
  );
}

function CsrActivityCard({
  activity,
  canJoin,
  joined,
  onJoined,
}: {
  activity: CsrActivity;
  canJoin: boolean;
  joined: boolean;
  onJoined: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleJoin() {
    if (activity.evidenceRequired && !file) {
      setMessage("Attach proof of participation before joining.");
      return;
    }
    setJoining(true);
    setMessage(null);
    try {
      const proofFilePath = file ? await uploadProofFile(file) : undefined;
      await apiClient.post(`/csr-activities/${activity.id}/join`, { proofFilePath });
      onJoined();
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    } finally {
      setJoining(false);
    }
  }

  return (
    <article className="csr-card" id={`csr-card-${activity.id}`}>
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
      {message && <p className="csr-card__message">{message}</p>}
      {canJoin && !joined && activity.status === "open" && (
        <>
          {activity.evidenceRequired && (
            <label className="csr-card__file-label" htmlFor={`proof-${activity.id}`}>
              Proof file
              <input
                id={`proof-${activity.id}`}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          <button type="button" className="csr-card__join-btn" disabled={joining} onClick={handleJoin}>
            {joining ? "Joining…" : "Join activity"}
          </button>
        </>
      )}
      {joined && <p className="csr-card__joined-flag">Joined</p>}
    </article>
  );
}
