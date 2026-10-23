import type { Filters, SortKey } from './types'

export const SORTS: Record<SortKey, string> = {
  id: 'Default',
  'price:asc': 'Price: low to high',
  'price:desc': 'Price: high to low',
  'make:asc': 'Make: A to Z',
}

export const DEFAULT_FILTERS: Filters = {
  make: '', model: '', category: '', minPrice: '', maxPrice: '', available: false, sort: 'id',
}

const TEXT_KEYS = ['make', 'model', 'category', 'minPrice', 'maxPrice'] as const

/** Filters -> "?make=ford&available=1"; defaults are omitted so the plain page has a clean URL. */
export function filtersToSearch(f: Filters): string {
  const params = new URLSearchParams()
  for (const key of TEXT_KEYS) if (f[key]) params.set(key, f[key])
  if (f.available) params.set('available', '1')
  if (f.sort !== 'id') params.set('sort', f.sort)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/** Inverse of filtersToSearch; unknown params and unknown sort values are ignored. */
export function filtersFromSearch(search: string): Filters {
  const params = new URLSearchParams(search)
  const sort = params.get('sort') as SortKey
  return {
    ...Object.fromEntries(TEXT_KEYS.map((key) => [key, params.get(key) ?? ''])),
    available: params.get('available') === '1',
    sort: sort in SORTS ? sort : 'id',
  } as Filters
}
