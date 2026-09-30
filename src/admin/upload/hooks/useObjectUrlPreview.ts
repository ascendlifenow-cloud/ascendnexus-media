import { useEffect, useState } from "react";

export const useObjectUrlPreview = (file: File | null | undefined): string | undefined => {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!file || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      setPreviewUrl(undefined);
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return previewUrl;
};
