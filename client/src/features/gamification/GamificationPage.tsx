import { useEffect, useState } from "react";
import { apiClient, getApiErrorMessage } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { uploadProofFile } from "../../lib/uploads";
import "./gamification-page.css";

interface Challenge {
  id: string;
  title: string;
  description: string;
  xp: number;
  difficulty: "easy" | "medium" | "hard";
  status: string;
  deadline: string;
  evidenceRequired: boolean;
  category: { name: string };
  _count: { participations: number };
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

const TABS = ["Challenges", "Badges", "Rewards", "Leaderboard"] as const;
type Tab = (typeof TABS)[number];

export function GamificationPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("Challenges");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  function loadAll() {
    apiClient.get<Challenge[]>("/challenges").then((res) => setChallenges(res.data)).catch(() => {});
    apiClient.get<Badge[]>("/badges").then((res) => setBadges(res.data)).catch(() => {});
    apiClient.get<Reward[]>("/rewards").then((res) => setRewards(res.data)).catch(() => {});
    apiClient.get<LeaderboardEntry[]>("/leaderboard?scope=user").then((res) => setLeaderboard(res.data)).catch(() => {});
  }

  useEffect(loadAll, []);

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

  return (
    <div className="gamification-page" id="gamification-page" data-tour="gamification-tab">
      <h1>Gamification</h1>
      <div className="gamification-page__tabs" role="tablist">
        {TABS.map((t) => (
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
        <div className="gamification-page__grid">
          {challenges.length === 0 && <p className="gamification-page__empty">No challenges yet — create one.</p>}
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} canJoin={user?.role === "employee"} onJoined={loadAll} />
          ))}
        </div>
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

function ChallengeCard({
  challenge,
  canJoin,
  onJoined,
}: {
  challenge: Challenge;
  canJoin: boolean;
  onJoined: () => void;
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
