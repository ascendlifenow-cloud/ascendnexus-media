export class PublicWaveformValidationService {
  validateWaveformData(peaks?: number[]): boolean {
    return Array.isArray(peaks) && peaks.length > 0 && peaks.length <= 5000 && peaks.every((peak) => Number.isFinite(peak) && peak >= 0 && peak <= 1);
  }
}

export const publicWaveformValidationService = new PublicWaveformValidationService();

