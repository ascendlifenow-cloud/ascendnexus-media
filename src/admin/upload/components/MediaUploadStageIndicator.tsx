import type { MediaUploadJobStage } from "../../../models/media";
import { cx } from "../../../utils/format";

const stageLabels: Record<MediaUploadJobStage, string> = {
  selection: "Selection",
  validation: "Validation",
  storage_upload: "Storage Upload",
  asset_record_creation: "Asset Record",
  image_processing: "Image Processing",
  audio_processing: "Audio Processing",
  linking: "Linking",
  complete: "Complete",
  error: "Error",
};

const orderedStages: MediaUploadJobStage[] = ["selection", "validation", "storage_upload", "asset_record_creation", "image_processing", "audio_processing", "linking", "complete"];

export function MediaUploadStageIndicator({ stage, failed = false }: { stage: MediaUploadJobStage; failed?: boolean }) {
  const currentIndex = orderedStages.includes(stage) ? orderedStages.indexOf(stage) : orderedStages.length;
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={`Current upload stage: ${stageLabels[stage]}`}>
      {orderedStages.map((item, index) => (
        <span
          key={item}
          className={cx(
            "h-1.5 w-8 rounded-full bg-white/12",
            index <= currentIndex && "bg-anm-purple",
            item === stage && "bg-anm-gold",
            failed && item === stage && "bg-anm-pink",
          )}
          title={stageLabels[item]}
        />
      ))}
      {stage === "error" ? <span className="h-1.5 w-8 rounded-full bg-anm-pink" title="Error" /> : null}
    </div>
  );
}
