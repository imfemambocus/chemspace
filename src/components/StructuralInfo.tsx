import type { ReactNode } from 'react'
import type { Properties } from '../data/properties'
import { Formula } from './Formula'

// The left-hand identifier panel, mirroring PubChemLite's "Structural information".
export function StructuralInfo({ props, loading }: Readonly<{ props: Properties | null; loading: boolean }>) {
  return (
    <div className="rounded-xl border border-white/10 bg-neutral-950/60 p-5">
      <h2 className="text-xs uppercase tracking-wider text-neutral-500">Structural information</h2>

      {loading && <p className="mt-4 animate-pulse text-sm text-neutral-600">Loading…</p>}

      {!loading && !props && (
        <p className="mt-4 text-sm text-neutral-500">Properties unavailable for this compound.</p>
      )}

      {!loading && props && (
        <dl className="mt-4 space-y-3.5 text-sm">
          <Field label="Molecular formula">
            <Formula value={props.formula} className="identifier text-neutral-100" />
          </Field>
          <Field label="Monoisotopic mass">
            {props.monoisotopicMass != null ? (
              <span className="text-neutral-100">{props.monoisotopicMass.toFixed(5)} Da</span>
            ) : (
              dash
            )}
          </Field>
          <Field label="XLogP (predicted)">
            {props.xlogp != null ? <span className="text-neutral-100">{props.xlogp}</span> : dash}
          </Field>
          <Field label="Compound name">
            {props.iupacName ? (
              <span className="text-neutral-200">{props.iupacName}</span>
            ) : (
              dash
            )}
          </Field>
          <Field label="SMILES">
            <Identifier value={props.smiles} />
          </Field>
          <Field label="InChIKey">
            <Identifier value={props.inchiKey} />
          </Field>
          <Field label="InChI">
            <Identifier value={props.inchi} />
          </Field>
        </dl>
      )}
    </div>
  )
}

const dash = <span className="text-neutral-600">—</span>

function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1">{children}</dd>
    </div>
  )
}

function Identifier({ value }: Readonly<{ value?: string }>) {
  if (!value) return dash
  return <span className="identifier text-xs leading-relaxed text-neutral-300">{value}</span>
}
