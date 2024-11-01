import { describe, it, expect } from 'bun:test'
import type { SqlBuilder } from '../src/types'
import { Contact, Freight, Order } from './data'
import { sync as db, $ } from './db'

describe('SelectQuery API Tests', () => {

    it ('Does return correct refs', () => {
        var f = db.from(Order), 
            o = f.ref

        expect(o.$ref.cls).toBe(Order)

        const q = f.join(Contact, { 
            on:(o:Order, c:Contact) => $`${o.contactId} = ${c.id}` 
        })

        expect(q.ref.$ref.cls).toBe(Order)
        expect(q.refOf(Order)!.$ref.cls).toBe(Order)
        expect(q.refOf(Contact)!.$ref.cls).toBe(Contact)

        var [o, c] = q.refsOf(Order,Contact)

        expect(o.$ref.cls).toBe(Order)
        expect(c.$ref.cls).toBe(Contact)

        var [c, o] = q.refsOf(Contact,Order)

        expect(o.$ref.cls).toBe(Order)
        expect(c.$ref.cls).toBe(Contact)

        expect(q.refOf(Freight)).toBeNull()

        expect(() => q.refsOf(Freight,Contact,Order)).toThrow("Could not find ref for 'Freight'")
    })

    it ('Does merge params', () => {
        const id = 1
        const city = 'Austin'

        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(sql).toContain(`FROM "Contact" WHERE a = $1 AND city = $2`)
            expect(params).toEqual({ '1':id, '2':city })
        }

        assert(db.from(Contact).where(c => $`a = ${id} AND city = ${city}`))
        assert(db.from(Contact).where`a = ${id}`.and`city = ${city}`)
        assert(db.from(Contact).where( { sql:[$`a = ${id}`, $`city = ${city}`] }))
        assert(db.from(Contact).where( { sql:$`a = ${id}` }).and({ sql:$`city = ${city}` }))
        assert(db.from(Contact).where( { rawSql:`a = $1 AND city = $2`, params: { [1]:id, [2]:city }  }))
    })

})
