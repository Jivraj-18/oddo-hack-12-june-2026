import { useEffect, useState, type FormEvent } from "react";
import { apiClient, getApiErrorMessage, getApiFieldErrors } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { uploadProofFile } from "../../lib/uploads";
import "./gamification-page.css";

interface Category {
  id: string;
  name: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  xp: number;
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "active" | "under_review" | "completed" | "archived";
  deadline: string;
  evidenceRequired: boolean;
  category: { name: string };
  _count: { participations: number };
}

interface ChallengeParticipation {
  id: string;
  proofFilePath: string | null;
  createdAt: string;
  user: { name: string };
  challenge: { title: string; xp: number };
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  stock: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  xpBalance: number;
  department: { name: string } | null;
}

const NEXT_STATUS: Record<Challenge["status"], Challenge["status"][]> = {
  draft: ["active", "archived"],
  active: ["under_review", "archived"],
  under_review: ["completed", "archived"],
  completed: ["archived"],
  archived: [],
};

const TABS = ["Challenges", "Challenge Participation", "Badges", "Rewards", "Leaderboard"] as const;
type Tab = (typeof TABS)[number];

export function GamificationPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("Challenges");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participations, setParticipations] = useState<ChallengeParticipation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const isManager = user?.role === "admin" || user?.role === "manager";

  function loadAll() {
    apiClient.get<Challenge[]>("/challenges").then((res) => setChallenges(res.data)).catch(() => {});
    apiClient.get<Badge[]>("/badges").then((res) => setBadges(res.data)).catch(() => {});
    apiClient.get<Reward[]>("/rewards").then((res) => setRewards(res.data)).catch(() => {});
    apiClient.get<LeaderboardEntry[]>("/leaderboard?scope=user").then((res) => setLeaderboard(res.data)).catch(() => {});
    apiClient.get<Category[]>("/categories").then((res) => setCategories(res.data)).catch(() => {});
    if (isManager) {
      apiClient
        .get<ChallengeParticipation[]>("/challenge-participations", { params: { status: "pending" } })
        .then((res) => setParticipations(res.data))
        .catch(() => {});
    }
  }

  useEffect(loadAll, [isManager]);

  async function handleRedeem(id: string) {
    setMessage(null);
    try {
      await apiClient.post(`/rewards/${id}/redeem`);
      setMessage("Reward redeemed.");
      loadAll();
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    }
  }

  async function handleReviewParticipation(id: string, decision: "approve" | "reject") {
    try {
      await apiClient.patch(`/challenge-participations/${id}/${decision}`);
      loadAll();
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    }
  }

  async function handleStatusChange(challengeId: string, status: Challenge["status"]) {
    try {
      await apiClient.patch(`/challenges/${challengeId}/status`, { status });
      loadAll();
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    }
  }

  return (
    <div className="gamification-page" id="gamification-page" data-tour="gamification-tab">
      <h1>Gamification</h1>
      <div className="gamification-page__tabs" role="tablist">
        {TABS.filter((t) => t !== "Challenge Participation" || isManager).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={"gamification-page__tab" + (tab === t ? " is-active" : "")}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {message && <p className="gamification-page__message">{message}</p>}

      {tab === "Challenges" && (
        <>
          {isManager && <CreateChallengeForm categories={categories} onCreated={loadAll} />}
          <div className="gamification-page__grid">
            {challenges.length === 0 && <p className="gamification-page__empty">No challenges yet — create one.</p>}
            {challenges.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                canJoin={user?.role === "employee"}
                isManager={isManager}
                onJoined={loadAll}
                onStatusChange={(status) => handleStatusChange(c.id, status)}
              />
            ))}
          </div>
        </>
      )}

      {tab === "Challenge Participation" && isManager && (
        <table className="gamification-page__table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Challenge</th>
              <th>Proof</th>
              <th>XP</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {participations.length === 0 && (
              <tr>
                <td colSpan={6} className="gamification-page__empty-row">
                  No pending challenge participations to review.
                </td>
              </tr>
            )}
            {participations.map((p) => (
              <tr key={p.id}>
                <td>{p.user.name}</td>
                <td>{p.challenge.title}</td>
                <td>
                  {p.proofFilePath ? (
                    <a href={`http://localhost:4000${p.proofFilePath}`} target="_blank" rel="noreferrer">
                      View proof
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{p.challenge.xp}</td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="gamification-page__actions">
                  <button type="button" className="gamification-page__approve-btn" onClick={() => handleReviewParticipation(p.id, "approve")}>
                    Approve
                  </button>
                  <button type="button" className="gamification-page__reject-btn" onClick={() => handleReviewParticipation(p.id, "reject")}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "Badges" && (
        <div className="gamification-page__badge-grid">
          {badges.map((b) => (
            <div key={b.id} className={"badge-tile" + (b.unlocked ? " is-unlocked" : " is-locked")}>
              <span className="badge-tile__icon" aria-hidden="true">
                {b.icon === "sparkles" ? "✦" : b.icon === "leaf" ? "❧" : b.icon === "trophy" ? "🏆" : "🤝"}
              </span>
              <span className="badge-tile__name">{b.name}</span>
              <span className="badge-tile__description">{b.description}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "Rewards" && (
        <div className="gamification-page__grid">
          {rewards.map((r) => (
            <article key={r.id} className="reward-card">
              <h3>{r.name}</h3>
              <p className="reward-card__description">{r.description}</p>
              <div className="reward-card__meta">
                <span>{r.pointsRequired} pts</span>
                <span>{r.stock} in stock</span>
              </div>
              <button
                type="button"
                className="reward-card__redeem-btn"
                disabled={r.stock <= 0}
                onClick={() => handleRedeem(r.id)}
              >
                {r.stock <= 0 ? "Out of stock" : "Redeem"}
              </button>
            </article>
          ))}
        </div>
      )}

      {tab === "Leaderboard" && (
        <table className="gamification-page__table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Department</th>
              <th>XP</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, i) => (
              <tr key={entry.id}>
                <td>{i + 1}</td>
                <td>{entry.name}</td>
                <td>{entry.department?.name ?? "—"}</td>
                <td>{entry.xpBalance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CreateChallengeForm({ categories, onCreated }: { categories: Category[]; onCreated: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [xp, setXp] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [evidenceRequired, setEvidenceRequired] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await apiClient.post("/challenges", { title, categoryId, description, xp, difficulty, evidenceRequired, deadline });
      setTitle("");
      setCategoryId("");
      setDescription("");
      setXp("");
      setEvidenceRequired(false);
      setDeadline("");
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
    <div className="gamification-page__create">
      <button type="button" className="gamification-page__add-btn" onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancel" : "Create challenge"}
      </button>
      {showForm && (
        <form className="gamification-page__form" onSubmit={handleSubmit} noValidate>
          {formError && <p className="gamification-page__form-error">{formError}</p>}
          <label htmlFor="challenge-title">
            Title
            <input id="challenge-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            {fieldErrors.title && <span className="gamification-page__field-error">{fieldErrors.title}</span>}
          </label>
          <label htmlFor="challenge-category">
            Category
            <select id="challenge-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && <span className="gamification-page__field-error">{fieldErrors.categoryId}</span>}
          </label>
          <label htmlFor="challenge-description">
            Description
            <input id="challenge-description" value={description} onChange={(e) => setDescription(e.target.value)} required />
            {fieldErrors.description && <span className="gamification-page__field-error">{fieldErrors.description}</span>}
          </label>
          <label htmlFor="challenge-xp">
            XP
            <input id="challenge-xp" type="number" min="1" value={xp} onChange={(e) => setXp(e.target.value)} required />
            {fieldErrors.xp && <span className="gamification-page__field-error">{fieldErrors.xp}</span>}
          </label>
          <label htmlFor="challenge-difficulty">
            Difficulty
            <select id="challenge-difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label htmlFor="challenge-deadline">
            Deadline
            <input id="challenge-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            {fieldErrors.deadline && <span className="gamification-page__field-error">{fieldErrors.deadline}</span>}
          </label>
          <label className="gamification-page__checkbox-label" htmlFor="challenge-evidence">
            <input
              id="challenge-evidence"
              type="checkbox"
              checked={evidenceRequired}
              onChange={(e) => setEvidenceRequired(e.target.checked)}
            />
            Evidence required
          </label>
          <button type="submit" className="gamification-page__submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save challenge"}
          </button>
        </form>
      )}
    </div>
  );
}

function ChallengeCard({
  challenge,
  canJoin,
  isManager,
  onJoined,
  onStatusChange,
}: {
  challenge: Challenge;
  canJoin: boolean;
  isManager: boolean;
  onJoined: () => void;
  onStatusChange: (status: Challenge["status"]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleJoin() {
    if (challenge.evidenceRequired && !file) {
      setMessage("Attach proof before joining this challenge.");
      return;
    }
    setJoining(true);
    setMessage(null);
    try {
      const proofFilePath = file ? await uploadProofFile(file) : undefined;
      await apiClient.post(`/challenges/${challenge.id}/join`, { proofFilePath });
      setJoined(true);
      onJoined();
    } catch (err) {
      setMessage(getApiErrorMessage(err));
    } finally {
      setJoining(false);
    }
  }

  return (
    <article className="challenge-card">
      <div className="challenge-card__header">
        <h3>{challenge.title}</h3>
        <span className={`challenge-card__difficulty challenge-card__difficulty--${challenge.difficulty}`}>{challenge.difficulty}</span>
      </div>
      <p className="challenge-card__category">{challenge.category.name}</p>
      <p className="challenge-card__description">{challenge.description}</p>
      <div className="challenge-card__meta">
        <span>{challenge.xp} XP</span>
        <span>Deadline {new Date(challenge.deadline).toLocaleDateString()}</span>
        <span>{challenge._count.participations} joined</span>
      </div>
      <span className={`challenge-card__status challenge-card__status--${challenge.status}`}>{challenge.status.replace("_", " ")}</span>
      {message && <p className="challenge-card__message">{message}</p>}

      {isManager && NEXT_STATUS[challenge.status].length > 0 && (
        <div className="challenge-card__transitions">
          {NEXT_STATUS[challenge.status].map((next) => (
            <button key={next} type="button" className="challenge-card__transition-btn" onClick={() => onStatusChange(next)}>
              {next === "archived" ? "Archive" : `Move to ${next.replace("_", " ")}`}
            </button>
          ))}
        </div>
      )}

      {canJoin && !joined && challenge.status === "active" && (
        <>
          {challenge.evidenceRequired && (
            <label className="challenge-card__file-label" htmlFor={`challenge-proof-${challenge.id}`}>
              Proof file
              <input
                id={`challenge-proof-${challenge.id}`}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
          <button type="button" className="challenge-card__join-btn" disabled={joining} onClick={handleJoin}>
            {joining ? "Joining…" : "Join challenge"}
          </button>
        </>
      )}
      {joined && <p className="challenge-card__joined-flag">Joined</p>}
    </article>
  );
}
