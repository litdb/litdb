import { describe, it, expect } from 'bun:test'
import { one, two } from '../src'

describe('should', () => {
  it('export 1', () => {
    expect(one).toBe(1)
  })

  it('export 2', () => {
    expect(two).toBe(2)
  })
})
