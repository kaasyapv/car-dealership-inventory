import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, filtersFromSearch, filtersToSearch } from './filters'

describe('filters <-> URL', () => {
  it('serialises only non-default values', () => {
    expect(filtersToSearch(DEFAULT_FILTERS)).toBe('')
    expect(filtersToSearch({ ...DEFAULT_FILTERS, make: 'ford', available: true, sort: 'price:desc' })).toBe(
      '?make=ford&available=1&sort=price%3Adesc',
    )
  })

  it('parses a query string back into filters', () => {
    expect(filtersFromSearch('?make=ford&minPrice=100&available=1&sort=price:asc')).toEqual({
      ...DEFAULT_FILTERS, make: 'ford', minPrice: '100', available: true, sort: 'price:asc',
    })
  })

  it('round-trips', () => {
    const f = { make: 'a b', model: 'x&y', category: 'SUV', minPrice: '1', maxPrice: '9', available: true, sort: 'make:asc' as const }
    expect(filtersFromSearch(filtersToSearch(f))).toEqual(f)
  })

  it('ignores unknown sort values and junk params', () => {
    expect(filtersFromSearch('?sort=drop-table&zzz=1')).toEqual(DEFAULT_FILTERS)
  })
})
