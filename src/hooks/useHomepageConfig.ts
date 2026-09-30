import { useQuery } from "@tanstack/react-query";
import { HomepageConfigService } from "../services/HomepageConfigService";

const homepageConfigService = new HomepageConfigService();

export const useHomepageConfig = () =>
  useQuery({
    queryKey: ["homepage-config"],
    queryFn: () => homepageConfigService.getEnabledHomepageSections(),
  });
