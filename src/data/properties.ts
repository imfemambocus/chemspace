// Compound identifiers and computed descriptors from PubChem's PUG REST property
// endpoint. These populate the "Structural information" panel and the 3D property
// radar. Note: PubChem renamed the SMILES property (IsomericSMILES -> SMILES) in a
// 2025 API change, so we try the new name and fall back to the old one.

import { readCache, writeCache } from './cache'

export interface Properties {
  cid: number
  iupacName?: string
  formula?: string
  molecularWeight?: number
  monoisotopicMass?: number
  smiles?: string
  inchi?: string
  inchiKey?: string
  xlogp?: number
  tpsa?: number
  hbd?: number
  hba?: number
  rotatable?: number
}

const CORE = [
  'MolecularFormula',
  'MolecularWeight',
  'MonoisotopicMass',
  'InChI',
  'InChIKey',
  'XLogP',
  'TPSA',
  'HBondDonorCount',
  'HBondAcceptorCount',
  'RotatableBondCount',
  'IUPACName',
]

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number.parseFloat(v) : (v as number)
  return Number.isFinite(n) ? n : undefined
}

async function request(
  cid: number,
  smilesKey: 'SMILES' | 'IsomericSMILES',
  signal?: AbortSignal,
): Promise<Properties> {
  const list = [...CORE, smilesKey].join(',')
  const url = `/pubchem/rest/pug/compound/cid/${cid}/property/${list}/JSON`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`PubChem properties returned ${res.status} for CID ${cid}`)

  const json = await res.json()
  const row = json?.PropertyTable?.Properties?.[0]
  if (!row) throw new Error(`No properties for CID ${cid}`)

  return {
    cid,
    iupacName: row.IUPACName,
    formula: row.MolecularFormula,
    molecularWeight: num(row.MolecularWeight),
    monoisotopicMass: num(row.MonoisotopicMass),
    smiles: row[smilesKey],
    inchi: row.InChI,
    inchiKey: row.InChIKey,
    xlogp: num(row.XLogP),
    tpsa: num(row.TPSA),
    hbd: num(row.HBondDonorCount),
    hba: num(row.HBondAcceptorCount),
    rotatable: num(row.RotatableBondCount),
  }
}

export async function fetchProperties(cid: number, signal?: AbortSignal): Promise<Properties> {
  const key = `prop:${cid}`
  const hit = readCache<Properties>(key)
  if (hit) return hit

  // Try the current SMILES property name, fall back to the pre-2025 one. Skip the
  // fallback if the request was aborted (superseded by a newer search).
  let props: Properties
  try {
    props = await request(cid, 'SMILES', signal)
  } catch (e) {
    if (signal?.aborted) throw e
    props = await request(cid, 'IsomericSMILES', signal)
  }
  writeCache(key, props)
  return props
}

// Descriptors for the radar, each normalized against a typical small-molecule range
// so the bars are comparable. `norm` drives bar height; `display` is the real value.
export interface Descriptor {
  key: string
  label: string
  short: string
  unit: string
  norm: number
  display: string
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

function make(
  key: string,
  label: string,
  short: string,
  unit: string,
  value: number | undefined,
  norm: (v: number) => number,
  fmt: (v: number) => string,
): Descriptor {
  const has = value != null
  return {
    key,
    label,
    short,
    unit,
    norm: has ? clamp01(norm(value)) : 0,
    display: has ? fmt(value) : '—',
  }
}

export function descriptors(p: Properties): Descriptor[] {
  return [
    make('mw', 'Molecular weight', 'MW', 'g/mol', p.molecularWeight, (v) => v / 600, (v) => v.toFixed(1)),
    make('xlogp', 'XLogP', 'XLogP', '', p.xlogp, (v) => (v + 3) / 10, (v) => v.toFixed(1)),
    make('tpsa', 'Polar surface area', 'TPSA', 'Å²', p.tpsa, (v) => v / 180, (v) => v.toFixed(0)),
    make('hbd', 'H-bond donors', 'HBD', '', p.hbd, (v) => v / 6, String),
    make('hba', 'H-bond acceptors', 'HBA', '', p.hba, (v) => v / 12, String),
    make('rot', 'Rotatable bonds', 'RotB', '', p.rotatable, (v) => v / 12, String),
  ]
}

// Druglikeness read straight off the descriptors above, no extra request. Lipinski's Rule
// of Five and Veber are exact, well-known threshold rules. QED (Bickerton et al. 2012) is
// approximate here: PubChem's property endpoint does not expose the aromatic-ring and
// structural-alert counts that two of QED's eight terms need, so we compute the weighted
// QED over the six descriptors we do have and flag it "QED*" in the UI.

export interface Criterion {
  label: string // e.g. "MW ≤ 500"
  ok: boolean
  value: string
}

export interface Rule {
  key: string
  name: string
  full: string // spelled-out name, shown as a caption
  pass: boolean
  complete: boolean // false if a descriptor a criterion needs was missing
  summary: string
  criteria: Criterion[]
}

export interface Druglikeness {
  rules: Rule[]
  qed?: number
}

// build a criterion only when its underlying value is present; a missing value is unknown,
// not a violation
function crit(
  label: string,
  value: number | undefined,
  ok: (v: number) => boolean,
  fmt: (v: number) => string,
): Criterion | null {
  if (value == null) return null
  return { label, ok: ok(value), value: fmt(value) }
}

function rule(key: string, name: string, full: string, passWithin: number, raw: (Criterion | null)[]): Rule {
  const criteria = raw.filter((c): c is Criterion => c != null)
  const violations = criteria.filter((c) => !c.ok).length
  return {
    key,
    name,
    full,
    pass: violations <= passWithin,
    complete: criteria.length === raw.length,
    summary: `${violations} violation${violations === 1 ? '' : 's'}`,
    criteria,
  }
}

// QED asymmetric double-sigmoidal (ADS) desirability parameters, as used by RDKit's QED,
// for the six terms PubChem gives us. Each row is [A, B, C, D, E, F, DMAX]; the aromatic-ring
// and structural-alert rows are omitted (see the note above).
type Ads = readonly [number, number, number, number, number, number, number]
const ADS: Record<string, Ads> = {
  mw: [2.817065973, 392.5754953, 290.7489764, 2.419764353, 49.22325677, 65.37051707, 104.9805561],
  alogp: [3.172690585, 137.8624751, 2.534937431, 4.581497897, 0.8227391543, 0.5762955609, 131.3186604],
  hba: [2.948620388, 160.4605972, 3.615294657, 4.435986202, 0.290141953, 1.300669958, 148.7763046],
  hbd: [1.618662227, 1010.051101, 0.985094388, 0.000000000103, 0.713820843, 0.920922555, 258.1632616],
  psa: [1.876861559, 125.2232657, 62.90773554, 87.83366614, 12.01999824, 28.51324732, 104.5686167],
  rotb: [0.01, 272.4121427, 2.55837997, 1.565547684, 1.271567166, 2.758063707, 105.4420403],
}
// QED weights (weighted variant), only for the six terms we can compute
const QED_W: Record<string, number> = { mw: 0.66, alogp: 0.46, hba: 0.05, hbd: 0.61, psa: 0.06, rotb: 0.65 }

// desirability for one property, normalized to (0, 1]
function ads(x: number, [a, b, c, d, e, f, dmax]: Ads): number {
  const s1 = 1 / (1 + Math.exp(-(x - c + d / 2) / e))
  const s2 = 1 / (1 + Math.exp(-(x - c - d / 2) / f))
  return (a + b * s1 * (1 - s2)) / dmax
}

// Weighted QED over the six PubChem descriptors: the weighted geometric mean of the per-
// property desirabilities. Returns undefined if too few descriptors are present to mean much.
function qed(p: Properties): number | undefined {
  const inputs: [string, number | undefined][] = [
    ['mw', p.molecularWeight],
    ['alogp', p.xlogp], // XLogP stands in for QED's Crippen ALOGP
    ['hba', p.hba],
    ['hbd', p.hbd],
    ['psa', p.tpsa],
    ['rotb', p.rotatable],
  ]
  let acc = 0
  let wSum = 0
  let n = 0
  for (const [key, v] of inputs) {
    if (v == null) continue
    const d = Math.max(ads(v, ADS[key]), 1e-9) // guard against ln(0)
    acc += QED_W[key] * Math.log(d)
    wSum += QED_W[key]
    n++
  }
  if (n < 4 || wSum === 0) return undefined
  return Math.exp(acc / wSum)
}

export function druglikeness(p: Properties): Druglikeness {
  return {
    rules: [
      // Lipinski passes with up to one violation; Veber needs both criteria met.
      rule('lipinski', 'Lipinski', 'Rule of Five', 1, [
        crit('MW ≤ 500', p.molecularWeight, (v) => v <= 500, (v) => v.toFixed(1)),
        crit('XLogP ≤ 5', p.xlogp, (v) => v <= 5, (v) => v.toFixed(1)),
        crit('HBD ≤ 5', p.hbd, (v) => v <= 5, String),
        crit('HBA ≤ 10', p.hba, (v) => v <= 10, String),
      ]),
      rule('veber', 'Veber', 'Oral bioavailability', 0, [
        crit('Rotatable bonds ≤ 10', p.rotatable, (v) => v <= 10, String),
        crit('TPSA ≤ 140', p.tpsa, (v) => v <= 140, (v) => v.toFixed(0)),
      ]),
    ],
    qed: qed(p),
  }
}
