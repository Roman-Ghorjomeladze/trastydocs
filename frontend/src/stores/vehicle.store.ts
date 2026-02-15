import { create } from 'zustand';
import type { Vehicle, VehicleType } from '../types/index.ts';
import * as vehiclesApi from '../api/vehicles.ts';

interface VehicleState {
  vehicles: Vehicle[];
  isLoading: boolean;
}

interface VehicleActions {
  fetchVehicles: (companyId: string, type?: VehicleType) => Promise<void>;
  createVehicle: (
    companyId: string,
    data: {
      model: string;
      licensePlate: string;
      type: VehicleType;
      notes?: string;
    },
  ) => Promise<Vehicle>;
  updateVehicle: (
    companyId: string,
    id: string,
    data: {
      model?: string;
      licensePlate?: string;
      notes?: string;
      isActive?: boolean;
    },
  ) => Promise<Vehicle>;
  deleteVehicle: (companyId: string, id: string) => Promise<void>;
}

export const useVehicleStore = create<VehicleState & VehicleActions>((set) => ({
  vehicles: [],
  isLoading: false,

  fetchVehicles: async (companyId, type) => {
    set({ isLoading: true });
    try {
      const vehicles = await vehiclesApi.getVehicles(companyId, type);
      set({ vehicles, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createVehicle: async (companyId, data) => {
    const vehicle = await vehiclesApi.createVehicle(companyId, data);
    set((state) => ({
      vehicles: [vehicle, ...state.vehicles],
    }));
    return vehicle;
  },

  updateVehicle: async (companyId, id, data) => {
    const updated = await vehiclesApi.updateVehicle(companyId, id, data);
    set((state) => ({
      vehicles: state.vehicles.map((v) =>
        v.id === id ? { ...v, ...updated } : v,
      ),
    }));
    return updated;
  },

  deleteVehicle: async (companyId, id) => {
    await vehiclesApi.deleteVehicle(companyId, id);
    set((state) => ({
      vehicles: state.vehicles.filter((v) => v.id !== id),
    }));
  },
}));
