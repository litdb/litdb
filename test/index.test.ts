import { describe, it, expect } from 'bun:test'
import { sqlite as $ } from '../src'

describe('should', () => {

  it('export 1', () => {
    console.log('$', $, typeof $)
    expect(true).toBe(true)
  })

})
