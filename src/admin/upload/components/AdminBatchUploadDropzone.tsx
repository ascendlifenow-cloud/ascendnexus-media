import { AdminDropzone } from "./AdminDropzone";
import { AdminFilePickerButton } from "./AdminFilePickerButton";

interface AdminBatchUploadDropzoneProps {
  accept?: string;
  maxFiles?: number;
  disabled?: boolean;
  onFilesSelected: (files: File[]) => void;
}

export function AdminBatchUploadDropzone({
  accept = "image/png,image/jpeg,image/webp,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,video/mp4,video/webm",
  maxFiles = 24,
  disabled = false,
  onFilesSelected,
}: AdminBatchUploadDropzoneProps) {
  return (
    <AdminDropzone
      disabled={disabled}
      multiple
      maxFiles={maxFiles}
      label="Batch Upload Media"
      description="Select multiple files for a single validation, upload, and review session."
      helperText="Images, audio, and video are supported. Unsafe file types are blocked before storage."
      onFilesDropped={onFilesSelected}
    >
      <AdminFilePickerButton
        label="Choose Batch Files"
        accept={accept}
        multiple
        disabled={disabled}
        onFilesSelected={(files) => onFilesSelected(Array.from(files))}
      />
    </AdminDropzone>
  );
}
