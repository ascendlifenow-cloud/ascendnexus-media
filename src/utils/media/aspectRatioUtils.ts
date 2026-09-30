import type { ImageOrientation } from "../../models/media";

const commonRatios: Array<{ label: string; ratio: number }> = [
  { label: "1:1", ratio: 1 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "3:4", ratio: 3 / 4 },
  { label: "1.91:1", ratio: 1.91 },
  { label: "9:16", ratio: 9 / 16 },
];

export const calculateAspectRatio = (width: number | null | undefined, height: number | null | undefined): number => {
  if (!width || !height || width <= 0 || height <= 0) return 0;
  return Number((width / height).toFixed(4));
};

export const isSquareEnough = (width: number | null | undefined, height: number | null | undefined, tolerance = 0.03): boolean => {
  const ratio = calculateAspectRatio(width, height);
  return ratio > 0 && Math.abs(ratio - 1) <= tolerance;
};

export const isWideEnough = (width: number | null | undefined, height: number | null | undefined, minimumRatio = 1.7): boolean =>
  calculateAspectRatio(width, height) >= minimumRatio;

export const getImageOrientation = (width: number | null | undefined, height: number | null | undefined): ImageOrientation => {
  const ratio = calculateAspectRatio(width, height);
  if (!ratio) return "unknown";
  if (isSquareEnough(width, height)) return "square";
  if (ratio >= 1.7) return "wide";
  if (ratio > 1) return "landscape";
  return "portrait";
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export const formatAspectRatioLabel = (width: number | null | undefined, height: number | null | undefined): string => {
  const ratio = calculateAspectRatio(width, height);
  if (!ratio || !width || !height) return "unknown";
  const close = commonRatios.find((item) => Math.abs(item.ratio - ratio) <= 0.03);
  if (close) return close.label;
  const divisor = gcd(Math.round(width), Math.round(height));
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
};
