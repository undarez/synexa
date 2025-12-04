import { create } from "zustand";

export interface SmartHomeLog {
  id: string;
  type: "device" | "routine" | "system";
  action: string;
  deviceId?: string;
  routineId?: string;
  status: "success" | "error" | "pending";
  timestamp: Date;
  details?: any;
}

interface LogsStore {
  logs: SmartHomeLog[];
  addLog: (log: Omit<SmartHomeLog, "id" | "timestamp">) => void;
  clearLogs: () => void;
  getLogsByDevice: (deviceId: string) => SmartHomeLog[];
  getLogsByRoutine: (routineId: string) => SmartHomeLog[];
}

export const useLogsStore = create<LogsStore>((set, get) => ({
  logs: [],

  addLog: (log) =>
    set((state) => ({
      logs: [
        {
          ...log,
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
        },
        ...state.logs,
      ].slice(0, 100), // Garder seulement les 100 derniers logs
    })),

  clearLogs: () => set({ logs: [] }),

  getLogsByDevice: (deviceId) =>
    get().logs.filter((log) => log.deviceId === deviceId),

  getLogsByRoutine: (routineId) =>
    get().logs.filter((log) => log.routineId === routineId),
}));




