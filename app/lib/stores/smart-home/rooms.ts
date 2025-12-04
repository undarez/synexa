import { create } from "zustand";

export interface SmartHomeRoom {
  id: string;
  name: string;
  icon: string;
  color: string;
  deviceCount: number;
}

interface RoomsStore {
  rooms: SmartHomeRoom[];
  selectedRoom: string | null;
  setRooms: (rooms: SmartHomeRoom[]) => void;
  selectRoom: (roomId: string | null) => void;
  fetchRooms: () => Promise<void>;
}

export const useRoomsStore = create<RoomsStore>((set) => ({
  rooms: [],
  selectedRoom: null,

  setRooms: (rooms) => set({ rooms }),

  selectRoom: (roomId) => set({ selectedRoom: roomId }),

  fetchRooms: async () => {
    try {
      const response = await fetch("/api/smart-home/data");
      const data = await response.json();
      set({ rooms: data.rooms || [] });
    } catch (error) {
      console.error("Erreur lors du chargement des pièces:", error);
    }
  },
}));




