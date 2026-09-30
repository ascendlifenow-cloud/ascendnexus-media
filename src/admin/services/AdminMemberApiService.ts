import type { MemberAccountResponse, MemberSessionResponse } from "../../../server/models/members/MemberModels";
import { adminApiBase } from "./AdminAuthApiService";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  errors?: string[];
}

const parse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => ({})) as ApiResponse<T>;
  if (!response.ok || payload.success === false) throw new Error(payload.errors?.join(" ") || `Admin member request failed with ${response.status}.`);
  return payload.data;
};

export class AdminMemberApiService {
  async listMembers() {
    return parse<MemberAccountResponse[]>(await fetch(`${adminApiBase()}/api/admin/members`, { credentials: "include" }));
  }

  async getMember(memberId: string) {
    return parse<{ member: MemberAccountResponse; sessions: MemberSessionResponse[] }>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}`, { credentials: "include" }));
  }

  async setStatus(memberId: string, status: MemberAccountResponse["status"]) {
    return parse<MemberAccountResponse>(await fetch(`${adminApiBase()}/api/admin/members/${encodeURIComponent(memberId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    }));
  }

  async health() {
    return parse<Record<string, unknown>>(await fetch(`${adminApiBase()}/api/admin/member-health`, { credentials: "include" }));
  }
}

export const adminMemberApiService = new AdminMemberApiService();
