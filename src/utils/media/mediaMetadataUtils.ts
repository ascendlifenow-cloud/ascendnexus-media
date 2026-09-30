export interface ImageDimensions {
  width: number;
  height: number;
}

const withObjectUrl = async <T>(file: File, read: (url: string) => Promise<T>): Promise<T> => {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new Error("Object URL APIs are unavailable.");
  }
  const url = URL.createObjectURL(file);
  try {
    return await read(url);
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const getImageDimensions = (file: File): Promise<ImageDimensions> =>
  withObjectUrl(file, (url) =>
    new Promise<ImageDimensions>((resolve, reject) => {
      if (typeof Image === "undefined") {
        reject(new Error("Image metadata APIs are unavailable."));
        return;
      }
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new Error("Image metadata could not be read."));
      image.src = url;
    }),
  );

export const getAudioDuration = (file: File): Promise<number> =>
  withObjectUrl(file, (url) =>
    new Promise<number>((resolve, reject) => {
      if (typeof Audio === "undefined") {
        reject(new Error("Audio metadata APIs are unavailable."));
        return;
      }
      const audio = new Audio();
      audio.preload = "metadata";
      audio.onloadedmetadata = () => resolve(audio.duration);
      audio.onerror = () => reject(new Error("Audio metadata could not be read."));
      audio.src = url;
    }),
  );
