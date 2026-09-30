import path from "node:path";
import type { MediaIntakeClassification, MediaIntakeMediaType } from "../../models/mediaIntake/MediaIntakeModels";

export interface MediaIntakeFileContext {
  filename: string;
  extension: string;
  detectedMediaType: MediaIntakeMediaType;
  detectedMimeType?: string;
}

export interface MediaIntakeClassificationResult {
  classification: MediaIntakeClassification;
  classificationRule: string;
  assetRole?: string;
  parsedTokens: Record<string, unknown>;
  sequenceNumber?: number;
}

interface MediaIntakeClassificationRule {
  ruleKey: string;
  priority: number;
  supportedMediaTypes: MediaIntakeMediaType[];
  matches(context: MediaIntakeFileContext): boolean;
  classify(context: MediaIntakeFileContext): MediaIntakeClassificationResult;
}

const baseName = (filename: string) => path.basename(filename, path.extname(filename));

class ArtistCharacterArtFilenameRule implements MediaIntakeClassificationRule {
  ruleKey = "artist_character_art";
  priority = 100;
  supportedMediaTypes: MediaIntakeMediaType[] = ["image"];
  private pattern = /^ANMX_(?<artistToken>.+?)[_-](?<sequence>\d{2,})\.[A-Za-z0-9]+$/;

  matches(context: MediaIntakeFileContext): boolean {
    return context.detectedMediaType === "image" && this.pattern.test(context.filename);
  }

  classify(context: MediaIntakeFileContext): MediaIntakeClassificationResult {
    const match = this.pattern.exec(context.filename);
    const artistToken = match?.groups?.artistToken?.trim() ?? "";
    const sequenceToken = match?.groups?.sequence ?? "";
    const sequenceNumber = Number(sequenceToken);
    return {
      classification: "artist_character_art",
      classificationRule: this.ruleKey,
      assetRole: sequenceNumber === 0 ? "artist_profile_image" : "artist_character_art",
      sequenceNumber,
      parsedTokens: { artistToken, sequenceToken, displayOrder: sequenceNumber },
    };
  }
}

class ReleaseCoverArtFilenameRule implements MediaIntakeClassificationRule {
  ruleKey = "release_cover_art";
  priority = 90;
  supportedMediaTypes: MediaIntakeMediaType[] = ["image"];
  private pattern = /^(?<releaseToken>.+)_CoverArt\.[A-Za-z0-9]+$/i;

  matches(context: MediaIntakeFileContext): boolean {
    return context.detectedMediaType === "image" && this.pattern.test(context.filename);
  }

  classify(context: MediaIntakeFileContext): MediaIntakeClassificationResult {
    const match = this.pattern.exec(context.filename);
    return {
      classification: "release_cover_art",
      classificationRule: this.ruleKey,
      assetRole: "release_cover_art",
      parsedTokens: { releaseToken: match?.groups?.releaseToken?.trim() ?? "" },
    };
  }
}

class GenericMediaRule implements MediaIntakeClassificationRule {
  constructor(public ruleKey: string, public priority: number, public supportedMediaTypes: MediaIntakeMediaType[], private classification: MediaIntakeClassification) {}
  matches(context: MediaIntakeFileContext): boolean {
    return this.supportedMediaTypes.includes(context.detectedMediaType);
  }
  classify(context: MediaIntakeFileContext): MediaIntakeClassificationResult {
    return {
      classification: this.classification,
      classificationRule: this.ruleKey,
      parsedTokens: { generalToken: baseName(context.filename) },
    };
  }
}

export class MediaIntakeClassificationRuleRegistry {
  private rules: MediaIntakeClassificationRule[] = [
    new ArtistCharacterArtFilenameRule(),
    new ReleaseCoverArtFilenameRule(),
    new GenericMediaRule("unclassified_image", 10, ["image"], "unclassified_image"),
    new GenericMediaRule("unclassified_audio", 9, ["audio"], "unclassified_audio"),
    new GenericMediaRule("unclassified_video", 8, ["video"], "unclassified_video"),
    new GenericMediaRule("unsupported_file", 1, ["unsupported"], "unsupported_file"),
  ];

  classify(context: MediaIntakeFileContext): MediaIntakeClassificationResult {
    const rule = [...this.rules].sort((a, b) => b.priority - a.priority).find((item) => item.matches(context));
    return rule?.classify(context) ?? {
      classification: "unsupported_file",
      classificationRule: "unsupported_file",
      parsedTokens: { generalToken: baseName(context.filename) },
    };
  }
}

export const mediaIntakeClassificationRuleRegistry = new MediaIntakeClassificationRuleRegistry();
