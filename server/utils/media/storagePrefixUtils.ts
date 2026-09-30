import type { MediaAccessLevel, MediaUploadTargetInput } from "../../models/mediaModels";
import { sanitizeFileName } from "./mediaPathUtils";

export const hasUnsafePrefix = (prefix: string | undefined): boolean =>
  !prefix || prefix.includes("..") || prefix.includes("\\") || prefix.includes("\0") || /^[a-z]+:/i.test(prefix);

const cleanSegment = (value: string | undefined, fallback: string): string =>
  (value || fallback).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || fallback;

export const getStorageNamespace = (target: MediaUploadTargetInput, accessLevel: MediaAccessLevel): string => {
  const entityId = cleanSegment(target.ownerId ?? target.targetId, "unassigned");
  if (accessLevel !== "public") {
    if (target.assetType === "full_song") return `releases/${entityId}/full-song`;
    if (target.targetType === "media_library") return `media-library/unassigned/${cleanSegment(target.assetType, "custom")}`;
    return `${cleanSegment(target.targetType, "media")}/${entityId}/${cleanSegment(target.assetType, "asset")}`;
  }
  if (target.targetType === "artist" && target.assetType.includes("banner")) return `artists/${entityId}/banner`;
  if (target.targetType === "artist") return `artists/${entityId}/profile`;
  if (target.targetType === "release" && target.assetType === "audio_preview") return `releases/${entityId}/audio-preview`;
  if (target.targetType === "release") return `releases/${entityId}/cover-art`;
  if (target.targetType === "gallery") return `gallery/${entityId}`;
  if (target.assetType === "logo") return "site/logo";
  if (target.assetType === "social_preview") return "site/social";
  return `${cleanSegment(target.targetType, "media")}/${entityId}/${cleanSegment(target.assetType, "asset")}`;
};

export const buildNamespacedStoragePath = (input: {
  accessLevel: MediaAccessLevel;
  target: MediaUploadTargetInput;
  fileName: string;
  publicPrefix: string;
  privatePrefix: string;
}): string => {
  const prefix = input.accessLevel === "public" ? input.publicPrefix : input.privatePrefix;
  const date = new Date().toISOString().slice(0, 10);
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return [prefix, getStorageNamespace(input.target, input.accessLevel), date, `${nonce}-${sanitizeFileName(input.fileName)}`]
    .join("/")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/+|\/+$/g, "");
};
