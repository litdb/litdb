import { describe, it, expect } from 'bun:test'
import { sqlite as $, column, Meta, table } from '../src'
import { str } from './utils'
import { createPathProxy } from '../src/sql';

@table()
class Person {
    @column('TEXT')
    name: string = '';
    @column('TEXT')
    email?: string;
    @column('INTEGER')
    age?: number = 18;
    @column('OBJECT')
    address: Address = new Address()
    @column('ARRAY')
    previousAddresses: Address[] = [];
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

    it('Can query nested objects with array index notation', () => {
        const q = $.from(Person, 'p')
            .select(p => $`${p.name}, ${p.previousAddresses[0]}`)    // 1) nested array in select
            .where(p => $`${p.previousAddresses[0].city} = 'LONDON'`)  // 2) nested array index in where, select, orderBy, etc.

        // console.log(q.toString())
        expect(str(q)).toEqual(`SELECT p."name", p.previousAddresses[0] FROM "Person" p WHERE p.previousAddresses[0].city = 'LONDON'`)
    })

    it('Proxy supports object and array nested properties', () => {
        const x = createPathProxy({ path:'x', meta:Meta.assert(Person) })
        expect(`${x.a.b.c}`).toEqual('x.a.b.c')
        expect(`${x.a[0][1]}`).toEqual('x.a[0][1]')
        expect(`${x["property.with.dots"]}`).toEqual('x["property.with.dots"]')
    })
})
