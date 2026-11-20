import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { findTarget, stopTour, useTour } from "./tour";

/** Caption card and spotlight for the guided demo. The spotlight follows its target every
 *  frame, so it stays on the control through scrolling and layout changes. */
export function TourOverlay() {
  const tour = useTour();
  const [box, setBox] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!tour.running || !tour.target) return setBox(null);
    let raf = 0;
    const tick = () => {
      setBox(findTarget(tour.target!)?.getBoundingClientRect() ?? null);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [tour.running, tour.target]);

  useEffect(() => {
    if (!tour.running) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") stopTour(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tour.running]);

  if (!tour.running && !tour.error) return null;
  const pct = tour.total ? Math.round(((tour.index + 1) / tour.total) * 100) : 0;
  return (
    <>
      {box && (
        <div aria-hidden className="pointer-events-none fixed z-[60] rounded-xl ring-4 ring-accent-500 ring-offset-2 ring-offset-white transition-[top,left,width,height] duration-200 ease-out-expo"
          style={{ top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8, boxShadow: "0 0 0 9999px rgb(8 17 13 / 0.28)" }} />
      )}
      <div role="status" aria-live="polite"
        className="fixed inset-x-3 bottom-4 z-[70] mx-auto flex max-w-2xl items-start gap-4 rounded-2xl bg-ink-900 p-4 text-white shadow-[0_24px_60px_-20px_rgb(8_17_13/0.7)] sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2 text-[0.72rem] font-bold text-ok-300">
            {tour.error ? "Guided demo" : <>Guided demo <span className="tabular-nums text-ink-300">{tour.index + 1} of {tour.total}</span></>}
          </div>
          <p className="text-[0.98rem] leading-snug [text-wrap:pretty]">{tour.error ?? tour.caption}</p>
          {!tour.error && (
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/12">
              <div className="h-full rounded-full bg-linear-to-r from-ok-400 via-accent-400 to-bad-300 transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <button type="button" onClick={stopTour} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-[0.82rem] font-semibold hover:bg-white/18">
          <X className="size-4" />{tour.error ? "Close" : "Stop"}
        </button>
      </div>
    </>
  );
}
