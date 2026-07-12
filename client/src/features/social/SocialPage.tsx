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

interface Participation {
  id: string;
  approvalStatus: "pending" | "approved" | "rejected";
  proofFilePath: string | null;
  pointsEarned: number;
  createdAt: string;
  user: { name: string };
  csrActivity: { title: string; points: number };
}

interface DiversityMetric {
  id: string;
  period: string;
  genderRatio: { male: number; female: number; other: number };
  trainingCompletionPct: string;
  department: { name: string };
}

const TABS = ["CSR Activities", "Employee Participation", "Diversity Dashboard"] as const;
type Tab = (typeof TABS)[number];

export function SocialPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("CSR Activities");
  const [activities, setActivities] = useState<CsrActivity[]>([]);
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [diversityMetrics, setDiversityMetrics] = useState<DiversityMetric[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const isManager = user?.role === "admin" || user?.role === "manager";

  function loadActivities() {
    apiClient
      .get<CsrActivity[]>("/csr-activities")
      .then((res) => setActivities(res.data))
      .catch(() => setError("Could not load CSR activities."));
  }

  function loadParticipations() {
    if (!isManager) return;
    apiClient
      .get<Participation[]>("/participations", { params: { status: "pending" } })
      .then((res) => setParticipations(res.data))
      .catch(() => setError("Could not load participations."));
  }

  function loadDiversity() {
    apiClient
      .get<DiversityMetric[]>("/diversity-metrics")
      .then((res) => setDiversityMetrics(res.data))
      .catch(() => setError("Could not load diversity metrics."));
  }

  useEffect(loadActivities, []);
  useEffect(loadParticipations, [isManager]);
  useEffect(loadDiversity, []);

  function handleJoined(activityId: string) {
    setJoinedIds((prev) => new Set(prev).add(activityId));
    loadActivities();
  }

  async function handleReview(participationId: string, decision: "approve" | "reject") {
    try {
      await apiClient.patch(`/participations/${participationId}/${decision}`);
      loadParticipations();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="social-page" id="social-page">
      <h1>Social</h1>
      <div className="social-page__tabs" role="tablist">
        {TABS.filter((t) => t !== "Employee Participation" || isManager).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={"social-page__tab" + (tab === t ? " is-active" : "")}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="social-page__error">{error}</p>}

      {tab === "CSR Activities" && (
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
      )}

      {tab === "Employee Participation" && isManager && (
        <table className="social-page__table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Activity</th>
              <th>Proof</th>
              <th>Points</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {participations.length === 0 && (
              <tr>
                <td colSpan={6} className="social-page__empty-row">
                  No pending participations to review.
                </td>
              </tr>
            )}
            {participations.map((p) => (
              <tr key={p.id}>
                <td>{p.user.name}</td>
                <td>{p.csrActivity.title}</td>
                <td>
                  {p.proofFilePath ? (
                    <a href={`http://localhost:4000${p.proofFilePath}`} target="_blank" rel="noreferrer">
                      View proof
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{p.csrActivity.points}</td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="social-page__actions">
                  <button type="button" className="social-page__approve-btn" onClick={() => handleReview(p.id, "approve")}>
                    Approve
                  </button>
                  <button type="button" className="social-page__reject-btn" onClick={() => handleReview(p.id, "reject")}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "Diversity Dashboard" && (
        <table className="social-page__table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Period</th>
              <th>Gender ratio (M/F/O)</th>
              <th>Training completion</th>
            </tr>
          </thead>
          <tbody>
            {diversityMetrics.map((m) => (
              <tr key={m.id}>
                <td>{m.department.name}</td>
                <td>{m.period}</td>
                <td>
                  {m.genderRatio.male}% / {m.genderRatio.female}% / {m.genderRatio.other}%
                </td>
                <td>{Number(m.trainingCompletionPct).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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
