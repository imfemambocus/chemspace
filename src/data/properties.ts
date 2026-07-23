// Compound identifiers and computed descriptors from PubChem's PUG REST property
// endpoint. These populate the "Structural information" panel and the 3D property
// radar. Note: PubChem renamed the SMILES property (IsomericSMILES -> SMILES) in a
// 2025 API change, so we try the new name and fall back to the old one.

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

async function request(cid: number, smilesKey: 'SMILES' | 'IsomericSMILES'): Promise<Properties> {
  const list = [...CORE, smilesKey].join(',')
  const url = `/pubchem/rest/pug/compound/cid/${cid}/property/${list}/JSON`
  const res = await fetch(url)
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

export async function fetchProperties(cid: number): Promise<Properties> {
  try {
    return await request(cid, 'SMILES')
  } catch {
    return await request(cid, 'IsomericSMILES')
  }
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
