import { create } from 'zustand'

export type RenderStyle = 'ballstick' | 'spacefill'

// View options shared between the HUD (which toggles them) and the 3D scene (which
// reads them). Molecule data and fetch status live as local state in App instead.
interface State {
  style: RenderStyle
  spin: boolean
  setStyle: (s: RenderStyle) => void
  toggleSpin: () => void
}

export const useStore = create<State>((set) => ({
  style: 'ballstick',
  spin: true,
  setStyle: (s) => set({ style: s }),
  toggleSpin: () => set((st) => ({ spin: !st.spin })),
}))
