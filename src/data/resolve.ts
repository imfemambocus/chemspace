// Resolves a free-text search query into a PubChem CID. The query can be a bare CID,
// a compound name ("caffeine"), or a SMILES string; names are the common case and
// SMILES is the structural fallback.
//   name-to-CID:   /rest/pug/compound/name/<q>/cids/JSON
//   smiles-to-CID: /rest/pug/compound/smiles/<q>/cids/JSON

async function cidFrom(namespace: 'name' | 'smiles', query: string): Promise<number | null> {
  const url = `/pubchem/rest/pug/compound/${namespace}/${encodeURIComponent(query)}/cids/JSON`
  const res = await fetch(url)
  if (!res.ok) return null // 404 when PubChem knows no such name/structure
  const json = await res.json()
  const cid = json?.IdentifierList?.CID?.[0]
  return typeof cid === 'number' && cid > 0 ? cid : null
}

export async function resolveCid(query: string): Promise<number> {
  const q = query.trim()
  if (!q) throw new Error('Enter a name, SMILES, or CID')

  // a bare positive integer is already a CID, so skip the lookup
  if (/^\d+$/.test(q)) {
    const n = Number.parseInt(q, 10)
    if (n > 0) return n
  }

  // try the name first (what most searches are), then treat the query as SMILES
  const byName = await cidFrom('name', q)
  if (byName) return byName

  const bySmiles = await cidFrom('smiles', q)
  if (bySmiles) return bySmiles

  throw new Error(`No compound found for "${q}"`)
}
