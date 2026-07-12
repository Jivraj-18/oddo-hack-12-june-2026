import "./tour.css";

export function TourBeacon() {
  return (
    <span className="tour-beacon" aria-hidden="true">
      <span className="tour-beacon__pulse" />
      <span className="tour-beacon__dot" />
    </span>
  );
}
