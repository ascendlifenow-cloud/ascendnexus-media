import { useRef } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "../../../components/ui/Button";

interface AdminFilePickerButtonProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFilesSelected: (files: FileList) => void;
}

export function AdminFilePickerButton({
  label = "Choose Files",
  accept,
  multiple = false,
  disabled = false,
  onFilesSelected,
}: AdminFilePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <Button type="button" variant="primary" disabled={disabled} onClick={() => inputRef.current?.click()}>
        <UploadCloud className="h-4 w-4" aria-hidden />
        {label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          if (event.currentTarget.files?.length) onFilesSelected(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
        aria-label={label}
      />
    </>
  );
}
