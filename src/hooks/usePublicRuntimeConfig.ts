import { useEffect, useState } from "react";
import type { PublicRuntimeConfig } from "../config/PublicRuntimeConfig";
import { publicRuntimeConfigService } from "../services/config/PublicRuntimeConfigService";

export function usePublicRuntimeConfig(injected?: PublicRuntimeConfig) {
  const [config, setConfig] = useState<PublicRuntimeConfig | null>(() => {
    try {
      return publicRuntimeConfigService.isLoaded() ? publicRuntimeConfigService.get() : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!config);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = await publicRuntimeConfigService.load(injected);
      setConfig(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error("Public runtime config failed to load."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!config) void load();
  }, []);

  return {
    config,
    error,
    isLoading,
    reload: load,
    getFeatureFlag: (name: keyof PublicRuntimeConfig["features"]) => publicRuntimeConfigService.getFeatureFlag(name),
  };
}
