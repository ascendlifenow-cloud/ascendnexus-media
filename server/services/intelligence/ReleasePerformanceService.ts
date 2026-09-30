import { contentPerformanceService } from "./ContentPerformanceService";

export class ReleasePerformanceService {
  buildReleasePerformance() {
    return contentPerformanceService.buildContentPerformance();
  }
}

export const releasePerformanceService = new ReleasePerformanceService();
