import { describe, it, expect } from 'bun:test'
import { sqlite as $, column, table } from '../src'
import { str } from './utils'

@table()
class Person {
    @column('TEXT')
    name: string = '';
    @column('TEXT')
    email?: string;
    @column('INTEGER')
    age?: number = 18;
    @column(Symbol('OBJECT'))
    address: Address = new Address()
}
class Address {
    street: string = ''
    city: string = ''
    state: string = ''
    zip?: string
}

describe('Nested Select Tests', () => {
    it('Can query nested objects', () => {
        const q = $.from(Person, 'p')
            .select(p => $`${p.name}, ${p.address.state}`)
            .where(p => $`${p.address.city} = 'LONDON'`)

        expect(str(q)).toEqual(`SELECT p."name", p.address.state FROM "Person" p WHERE p.address.city = 'LONDON'`)
    })
})
