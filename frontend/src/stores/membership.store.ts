import { create } from 'zustand';
import type {
  Membership,
  AddMemberDto,
  UpdateMemberDto,
  AddMemberResult,
  PendingInvitation,
} from '../types/index.ts';
import * as membershipsApi from '../api/memberships.ts';

interface MembershipState {
  members: Membership[];
  invitations: PendingInvitation[];
  isLoading: boolean;
}

interface MembershipActions {
  fetchMembers: (companyId: string) => Promise<void>;
  addMember: (
    companyId: string,
    data: AddMemberDto,
  ) => Promise<AddMemberResult>;
  updateMember: (
    companyId: string,
    memberId: string,
    data: UpdateMemberDto,
  ) => Promise<Membership>;
  removeMember: (companyId: string, memberId: string) => Promise<void>;
  fetchInvitations: (companyId: string) => Promise<void>;
  cancelInvitation: (
    companyId: string,
    invitationId: string,
  ) => Promise<void>;
  clearMembers: () => void;
}

export const useMembershipStore = create<MembershipState & MembershipActions>(
  (set) => ({
    // ── State ──
    members: [],
    invitations: [],
    isLoading: false,

    // ── Actions ──
    fetchMembers: async (companyId) => {
      set({ isLoading: true });
      try {
        const members = await membershipsApi.getMembers(companyId);
        set({ members, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    },

    addMember: async (companyId, data) => {
      const result = await membershipsApi.addMember(companyId, data);
      if (result.type === 'added' && result.membership) {
        set((state) => ({
          members: [...state.members, result.membership!],
        }));
      } else if (result.type === 'invited' && result.invitation) {
        set((state) => ({
          invitations: [result.invitation!, ...state.invitations],
        }));
      }
      return result;
    },

    updateMember: async (companyId, memberId, data) => {
      const updated = await membershipsApi.updateMember(
        companyId,
        memberId,
        data,
      );
      set((state) => ({
        members: state.members.map((m) => (m.id === memberId ? updated : m)),
      }));
      return updated;
    },

    removeMember: async (companyId, memberId) => {
      await membershipsApi.removeMember(companyId, memberId);
      set((state) => ({
        members: state.members.filter((m) => m.id !== memberId),
      }));
    },

    fetchInvitations: async (companyId) => {
      try {
        const invitations =
          await membershipsApi.getInvitations(companyId);
        set({ invitations });
      } catch {
        // Non-critical
      }
    },

    cancelInvitation: async (companyId, invitationId) => {
      await membershipsApi.cancelInvitation(companyId, invitationId);
      set((state) => ({
        invitations: state.invitations.filter((i) => i.id !== invitationId),
      }));
    },

    clearMembers: () => {
      set({ members: [], invitations: [], isLoading: false });
    },
  }),
);
