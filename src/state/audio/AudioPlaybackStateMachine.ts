import type { PublicAudioPlaybackStatus } from "./audioPlayerTypes";

const transitions: Record<PublicAudioPlaybackStatus, PublicAudioPlaybackStatus[]> = {
  idle: ["loading", "unavailable", "error"],
  loading: ["ready", "playing", "paused", "error", "unavailable", "idle"],
  ready: ["playing", "paused", "loading", "error", "unavailable", "idle"],
  playing: ["paused", "buffering", "ended", "error", "unavailable", "idle"],
  paused: ["playing", "loading", "ended", "error", "unavailable", "idle"],
  buffering: ["playing", "paused", "error", "unavailable", "idle"],
  ended: ["playing", "loading", "idle", "error", "unavailable"],
  error: ["loading", "idle"],
  blocked: ["loading", "idle"],
  unavailable: ["loading", "idle"],
};

export const canTransitionAudioState = (from: PublicAudioPlaybackStatus, to: PublicAudioPlaybackStatus): boolean =>
  from === to || transitions[from]?.includes(to) === true;

export const transitionAudioState = (from: PublicAudioPlaybackStatus, to: PublicAudioPlaybackStatus): PublicAudioPlaybackStatus =>
  canTransitionAudioState(from, to) ? to : from;

