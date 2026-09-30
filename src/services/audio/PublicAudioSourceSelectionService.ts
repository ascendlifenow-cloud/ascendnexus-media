import type { PublicAudioPreviewContract } from "../../state/audio/audioPlayerTypes";
import { publicAudioPreviewValidationService } from "./PublicAudioPreviewValidationService";

export interface PublicAudioSourceSelectionReport {
  preferredSource?: string;
  supportedSources: string[];
  blockingIssues: string[];
  warnings: string[];
}

export class PublicAudioSourceSelectionService {
  selectPreferredSource(preview?: PublicAudioPreviewContract | null): string | undefined {
    return this.buildSourceSelectionReport(preview).preferredSource;
  }

  getSupportedSources(preview?: PublicAudioPreviewContract | null): string[] {
    if (!preview?.url) return [];
    const validation = publicAudioPreviewValidationService.validatePreview(preview);
    if (!validation.valid) return [];
    if (preview.mimeType && !this.canPlayMimeType(preview.mimeType)) return [];
    return [preview.url];
  }

  canPlayMimeType(mimeType?: string): boolean {
    if (!mimeType || typeof document === "undefined") return true;
    const audio = document.createElement("audio");
    const support = audio.canPlayType(mimeType);
    return support === "probably" || support === "maybe";
  }

  buildSourceSelectionReport(preview?: PublicAudioPreviewContract | null): PublicAudioSourceSelectionReport {
    const validation = publicAudioPreviewValidationService.validatePreview(preview);
    const supportedSources = this.getSupportedSourcesWithoutRecursion(preview, validation.valid);
    return {
      preferredSource: supportedSources[0],
      supportedSources,
      blockingIssues: validation.blockingIssues,
      warnings: validation.warnings,
    };
  }

  private getSupportedSourcesWithoutRecursion(preview: PublicAudioPreviewContract | null | undefined, valid: boolean): string[] {
    if (!preview?.url || !valid) return [];
    if (preview.mimeType && !this.canPlayMimeType(preview.mimeType)) return [];
    return [preview.url];
  }
}

export const publicAudioSourceSelectionService = new PublicAudioSourceSelectionService();

