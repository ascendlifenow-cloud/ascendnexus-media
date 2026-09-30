import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { commandAvailable, runExternalProcess } from "../../utils/media/externalProcessUtils";

export interface MediaProcessingToolStatus {
  available: boolean;
  tool: string;
  configuredPath?: string;
  version?: string;
  capabilities: string[];
  message: string;
  checkedAt: string;
}

const now = () => new Date().toISOString();

export class MediaProcessingToolService {
  async detectSharp(): Promise<MediaProcessingToolStatus> {
    const sipsAvailable = await commandAvailable("/usr/bin/sips", ["--help"]);
    return {
      available: sipsAvailable,
      tool: sipsAvailable ? "sips" : "sharp",
      configuredPath: sipsAvailable ? "/usr/bin/sips" : undefined,
      capabilities: sipsAvailable ? ["image_metadata", "image_derivatives", "blur_placeholder"] : [],
      message: sipsAvailable
        ? "Sharp is not installed; using macOS sips for real local image processing."
        : "No image processing tool is available.",
      checkedAt: now(),
    };
  }

  async detectFfmpeg(): Promise<MediaProcessingToolStatus> {
    return this.detectExternalTool("ffmpeg", mediaBackendConfig.mediaAudioTranscodeEnabled ? mediaBackendConfig.mediaAudioTranscodeEnabled : undefined);
  }

  async detectFfprobe(): Promise<MediaProcessingToolStatus> {
    return this.detectExternalTool("ffprobe", mediaBackendConfig.mediaAudioMetadataEnabled ? mediaBackendConfig.mediaAudioMetadataEnabled : undefined);
  }

  async detectWaveformTool(): Promise<MediaProcessingToolStatus> {
    const ffmpeg = await this.detectFfmpeg();
    return {
      ...ffmpeg,
      tool: "waveform",
      capabilities: ffmpeg.available ? ["audio_waveform"] : [],
      message: ffmpeg.available ? "Waveform generation can use ffmpeg." : "Waveform generation unavailable without ffmpeg.",
    };
  }

  async getToolVersions() {
    const [image, ffmpeg, ffprobe, waveform] = await Promise.all([
      this.detectSharp(),
      this.detectFfmpeg(),
      this.detectFfprobe(),
      this.detectWaveformTool(),
    ]);
    return { image, ffmpeg, ffprobe, waveform };
  }

  async validateToolConfiguration() {
    const tools = await this.getToolVersions();
    const warnings: string[] = [];
    const errors: string[] = [];
    if (mediaBackendConfig.mediaAudioMetadataEnabled && !tools.ffprobe.available) {
      errors.push("FFprobe is required for enabled audio metadata processing.");
    }
    if (mediaBackendConfig.mediaAudioTranscodeEnabled && !tools.ffmpeg.available) {
      errors.push("FFmpeg is required for enabled audio transcoding.");
    }
    if (!tools.image.available) warnings.push("Image derivatives are unavailable because no server-side image processor is available.");
    if (!tools.waveform.available) warnings.push("Waveform generation is unavailable without FFmpeg.");
    return { valid: errors.length === 0, warnings, errors, tools };
  }

  async getHealth() {
    const validation = await this.validateToolConfiguration();
    return {
      imageProcessorAvailable: validation.tools.image.available,
      ffmpegAvailable: validation.tools.ffmpeg.available,
      ffprobeAvailable: validation.tools.ffprobe.available,
      waveformToolAvailable: validation.tools.waveform.available,
      checkedAt: now(),
      warnings: validation.warnings,
      errors: validation.errors,
      tools: validation.tools,
    };
  }

  private async detectExternalTool(tool: "ffmpeg" | "ffprobe", _required?: boolean): Promise<MediaProcessingToolStatus> {
    const configuredPath = tool === "ffmpeg" ? process.env.FFMPEG_PATH?.trim() : process.env.FFPROBE_PATH?.trim();
    const executable = configuredPath || tool;
    if (configuredPath) {
      try {
        await access(configuredPath, constants.X_OK);
      } catch {
        return {
          available: false,
          tool,
          configuredPath,
          capabilities: [],
          message: `${tool} configured path is not executable.`,
          checkedAt: now(),
        };
      }
    }
    const result = await runExternalProcess(executable, ["-version"], { timeoutMs: 5000 });
    const versionLine = result.stdout.split("\n")[0]?.trim();
    const available = result.exitCode === 0;
    return {
      available,
      tool,
      configuredPath,
      version: available ? versionLine : undefined,
      capabilities: available ? [tool === "ffprobe" ? "audio_metadata" : "audio_transcode", "audio_waveform"] : [],
      message: available ? `${tool} is available.` : `${tool} is not available.`,
      checkedAt: now(),
    };
  }
}

export const mediaProcessingToolService = new MediaProcessingToolService();
