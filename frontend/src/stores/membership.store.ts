import { create } from 'zustand';
import type { Membership, AddMemberDto, UpdateMemberDto } from '../types/index.ts';
import * as membershipsApi from '../api/memberships.ts';

interface MembershipState {
  members: Membership[];
  isLoading: boolean;
}

interface MembershipActions {
  fetchMembers: (companyId: string) => Promise<void>;
  addMember: (companyId: string, data: AddMemberDto) => Promise<Membership>;
  updateMember: (
    companyId: string,
    memberId: string,
    data: UpdateMemberDto,
  ) => Promise<Membership>;
  removeMember: (companyId: string, memberId: string) => Promise<void>;
  clearMembers: () => void;
}

export const useMembershipStore = create<MembershipState & MembershipActions>(
  (set) => ({
    // ── State ──
    members: [],
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
      const member = await membershipsApi.addMember(companyId, data);
      set((state) => ({ members: [...state.members, member] }));
      return member;
    },

    updateMember: async (companyId, memberId, data) => {
      const updated = await membershipsApi.updateMember(companyId, memberId, data);
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

    clearMembers: () => {
      set({ members: [], isLoading: false });
    },
  }),
);
