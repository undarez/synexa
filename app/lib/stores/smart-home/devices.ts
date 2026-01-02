import { create } from "zustand";

export interface SmartHomeDevice {
  id: string;
  name: string;
  type: string;
  room: string;
  status: "on" | "off";
  value?: number;
  icon: string;
  online: boolean;
  model?: string; // Sonoff Basic R4, Mini, S26, S40, L3, S-Mate
  capabilities?: {
    brightness?: boolean;
    temperature?: boolean;
    power?: boolean;
    color?: boolean;
  };
}

interface DevicesStore {
  devices: SmartHomeDevice[];
  loading: boolean;
  error: string | null;
  setDevices: (devices: SmartHomeDevice[]) => void;
  updateDevice: (deviceId: string, updates: Partial<SmartHomeDevice>) => void;
  toggleDevice: (deviceId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchDevices: () => Promise<void>;
}

export const useDevicesStore = create<DevicesStore>((set, get) => ({
  devices: [],
  loading: false,
  error: null,

  setDevices: (devices) => set({ devices }),

  updateDevice: (deviceId, updates) =>
    set((state) => ({
      devices: state.devices.map((device) =>
        device.id === deviceId ? { ...device, ...updates } : device
      ),
    })),

  toggleDevice: (deviceId) =>
    set((state) => ({
      devices: state.devices.map((device) =>
        device.id === deviceId
          ? { ...device, status: device.status === "on" ? "off" : "on" }
          : device
      ),
    })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  fetchDevices: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/smart-home/data");
      const data = await response.json();
      set({ devices: data.devices || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
}));




