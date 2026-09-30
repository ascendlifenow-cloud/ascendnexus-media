import type { DistributionDestination } from "../../models/operations/OperationsModels";
import { mediaTransformationService } from "./MediaTransformationService";
import { platformMetadataService } from "./PlatformMetadataService";

export class PlatformMediaBuilder {
  async buildForDestination(distributionJobId: string, entityType: string, entityId: string, assetId: string | undefined, destination: DistributionDestination) {
    const [metadata, transformations] = await Promise.all([
      platformMetadataService.buildMetadata(entityType, entityId, destination),
      mediaTransformationService.planTransformations(distributionJobId, assetId, [destination]),
    ]);
    return { destination, metadata, transformations };
  }
}

export const platformMediaBuilder = new PlatformMediaBuilder();
