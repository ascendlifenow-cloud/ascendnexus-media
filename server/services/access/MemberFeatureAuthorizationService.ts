import type { MemberAccountResponse } from "../../models/members/MemberModels";
import { accessPolicyEvaluationService } from "./AccessPolicyEvaluationService";

export class MemberFeatureAuthorizationService {
  canFavorite(member: MemberAccountResponse) {
    return accessPolicyEvaluationService.evaluateFeature({ type: "member", member }, "favorites");
  }
  canFollow(member: MemberAccountResponse) {
    return accessPolicyEvaluationService.evaluateFeature({ type: "member", member }, "following");
  }
  canCreatePlaylist(member: MemberAccountResponse) {
    return accessPolicyEvaluationService.evaluateFeature({ type: "member", member }, "playlists");
  }
  canViewHistory(member: MemberAccountResponse) {
    return accessPolicyEvaluationService.evaluateFeature({ type: "member", member }, "history.view");
  }
  canReceiveNotifications(member: MemberAccountResponse) {
    return accessPolicyEvaluationService.evaluateFeature({ type: "member", member }, "notifications");
  }
}

export const memberFeatureAuthorizationService = new MemberFeatureAuthorizationService();
