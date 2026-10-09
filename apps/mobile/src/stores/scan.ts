import { create } from 'zustand';

/** Hands a scanned VIN from the camera modal back to the editor that opened it. */
interface ScanState {
  vin: string | null;
  setVin: (vin: string | null) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  vin: null,
  setVin: (vin) => set({ vin }),
}));
