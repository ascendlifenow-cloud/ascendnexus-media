import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/Button";

interface CarouselControlsProps {
  onPrevious: () => void;
  onNext: () => void;
}

export function CarouselControls({ onPrevious, onNext }: CarouselControlsProps) {
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        onClick={onPrevious}
        variant="ghost"
        size="icon"
        aria-label="Previous releases"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        onClick={onNext}
        variant="ghost"
        size="icon"
        aria-label="Next releases"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  );
}
