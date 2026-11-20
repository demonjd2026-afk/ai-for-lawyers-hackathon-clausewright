import { Play } from "lucide-react";
import { Button } from "../components/ui/Button";
import { startTour, useTour, type TourId } from "./tour";

/** Starts the guided demo for the page it sits on. */
export function DemoButton({ tour }: { tour: TourId }) {
  const { running } = useTour();
  return (
    <Button variant="ghost" size="sm" disabled={running} onClick={() => void startTour(tour)} icon={<Play className="size-3.5 fill-current" />}>
      Watch this page's demo
    </Button>
  );
}
