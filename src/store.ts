import { create } from 'zustand'

export type RenderStyle = 'ballstick' | 'spacefill'

// View options shared between the HUD (which toggles them) and the 3D scene (which
// reads them). Molecule data and fetch status live as local state in App instead.
interface State {
  style: RenderStyle
  spin: boolean
  measure: boolean // whether click-to-measure is armed
  selection: number[] // picked atom indices, in click order (up to 4)
  setStyle: (s: RenderStyle) => void
  toggleSpin: () => void
  toggleMeasure: () => void
  pickAtom: (i: number) => void
  clearSelection: () => void
}

export const useStore = create<State>((set) => ({
  style: 'ballstick',
  spin: true,
  measure: false,
  selection: [],
  setStyle: (s) => set({ style: s }),
  toggleSpin: () => set((st) => ({ spin: !st.spin })),
  // leaving measure mode drops any in-progress selection; entering it stops the spin so
  // atoms hold still to click
  toggleMeasure: () =>
    set((st) => {
      const measure = !st.measure
      return { measure, selection: [], spin: measure ? false : st.spin }
    }),
  pickAtom: (i) =>
    set((st) => {
      if (st.selection.includes(i)) return { selection: st.selection.filter((x) => x !== i) }
      // a distance/angle/dihedral needs at most 4 atoms; a 5th click starts fresh
      if (st.selection.length >= 4) return { selection: [i] }
      return { selection: [...st.selection, i] }
    }),
  clearSelection: () => set({ selection: [] }),
}))
