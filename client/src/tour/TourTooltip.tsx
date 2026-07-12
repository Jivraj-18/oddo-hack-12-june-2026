import type { TooltipRenderProps } from "react-joyride";
import "./tour.css";

export function TourTooltip({
  step,
  index,
  size,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  isLastStep,
  tooltipProps,
}: TooltipRenderProps) {
  return (
    <div className="tour-tooltip" {...tooltipProps}>
      <button type="button" className="tour-tooltip__close" {...closeProps}>
        ×
      </button>
      {step.title && <h3 className="tour-tooltip__title">{step.title}</h3>}
      <div className="tour-tooltip__content">{step.content}</div>
      <div className="tour-tooltip__footer">
        <div className="tour-tooltip__dots" aria-hidden="true">
          {Array.from({ length: size }).map((_, i) => (
            <span key={i} className={"tour-tooltip__dot" + (i === index ? " is-active" : "")} />
          ))}
        </div>
        <div className="tour-tooltip__actions">
          {!isLastStep && (
            <button type="button" className="tour-tooltip__skip" {...skipProps}>
              Skip
            </button>
          )}
          {index > 0 && (
            <button type="button" className="tour-tooltip__back" {...backProps}>
              Back
            </button>
          )}
          <button type="button" className="tour-tooltip__primary" {...primaryProps}>
            {isLastStep ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
