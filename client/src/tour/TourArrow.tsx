import type { ArrowRenderProps } from "react-joyride";
import "./tour.css";

export function TourArrow({ base, size }: ArrowRenderProps) {
  return (
    <svg className="tour-arrow" width={base} height={size} viewBox={`0 0 ${base} ${size}`}>
      <polygon points={`0,0 ${base},0 ${base / 2},${size}`} />
    </svg>
  );
}
