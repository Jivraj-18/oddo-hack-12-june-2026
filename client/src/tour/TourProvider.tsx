import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useJoyride, STATUS, type Step } from "react-joyride";
import { TourBeacon } from "./TourBeacon";
import { TourTooltip } from "./TourTooltip";
import { TourArrow } from "./TourArrow";
import { useAuth } from "../lib/auth-context";

const STEPS: Step[] = [
  {
    target: '[data-tour="sidebar"]',
    title: "Seven modules, one ESG picture",
    content: "Environmental, Social, Governance, Gamification, and Reports all live here. Switch between them anytime.",
    placement: "right",
  },
  {
    target: '[data-tour="esg-score"]',
    title: "Your overall ESG score",
    content: "A weighted average of Environmental, Social, and Governance scores — weights are configurable in Settings.",
    placement: "bottom",
  },
  {
    target: '[data-tour="emissions-trend"]',
    title: "Score trend over time",
    content: "This chart is real historical data, recomputed by a scoring job as new activity comes in — not a static mockup.",
    placement: "top",
  },
  {
    target: '[data-tour="notification-bell"]',
    title: "Notifications arrive here",
    content: "Approvals, compliance alerts, and badge unlocks show up live as they happen.",
    placement: "bottom",
  },
  {
    target: '[data-tour="nav-gamification"]',
    title: "XP, badges, and rewards",
    content: "Join challenges, earn XP and badges, and redeem points for real rewards from the catalog.",
    placement: "right",
  },
  {
    target: '[data-tour="nav-reports"]',
    title: "Reports and exports",
    content: "Build a custom report by module and department, then export it as PDF, Excel, or CSV.",
    placement: "right",
  },
];

interface TourContextValue {
  start: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const { user, markTourComplete } = useAuth();
  const autoStarted = useRef(false);

  const { state, controls, Tour } = useJoyride({
    steps: STEPS,
    continuous: true,
    arrowComponent: TourArrow,
    beaconComponent: TourBeacon,
    tooltipComponent: TourTooltip,
    options: {
      overlayColor: "rgba(20, 23, 15, 0.45)",
    },
  });

  useEffect(() => {
    if (!user || autoStarted.current || user.tourCompletedAt) return;
    autoStarted.current = true;
    controls.start();
  }, [user, controls]);

  useEffect(() => {
    if ((state.status === STATUS.FINISHED || state.status === STATUS.SKIPPED) && !user?.tourCompletedAt) {
      markTourComplete().catch(() => {});
    }
  }, [state.status, user, markTourComplete]);

  return (
    <TourContext.Provider value={{ start: () => controls.start(0) }}>
      {children}
      {Tour}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}
