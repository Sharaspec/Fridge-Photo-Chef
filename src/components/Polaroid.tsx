import type { SampleId } from "../lib/samples";
import { BreakfastShelf, StudentFridge, TacoNight, VeggieCrate } from "./Illustrations";

export function SampleScene({ id, className }: { id: SampleId; className?: string }) {
  switch (id) {
    case "student":
      return <StudentFridge className={className} />;
    case "veggie":
      return <VeggieCrate className={className} />;
    case "breakfast":
      return <BreakfastShelf className={className} />;
    case "taco":
      return <TacoNight className={className} />;
  }
}

interface Props {
  /** Degrees of tilt, e.g. -3 */
  tilt?: number;
  caption?: React.ReactNode;
  /** "tape" across the top, or a "pin" like on a corkboard */
  fastener?: "tape" | "pin" | "none";
  developing?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** A Polaroid-style frame: white border, thick bottom, handwritten caption. */
export function Polaroid({ tilt = 0, caption, fastener = "tape", developing, className = "", children }: Props) {
  return (
    <figure
      className={`polaroid polaroid--${fastener}${developing ? " polaroid--developing" : ""} ${className}`}
      style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}
    >
      <div className="polaroid__photo">{children}</div>
      {caption && <figcaption className="polaroid__caption">{caption}</figcaption>}
    </figure>
  );
}
