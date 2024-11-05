import { describe, it, expect } from 'bun:test'
import { sqlite as $ } from '../src'
import { Contact, Order } from './data'
import { str } from './utils'

describe('SQLite SUB SELECT Tests', () => {

    it ('Can embed EXISTS builder on Contact', () => {
        const contactId = 1
        const exists = $.from(Order)
            .where(o => $`${o.contactId} = ${contactId} && ${o.freightId} = 1`)
            .select('*')

        var q = $.from(Contact).where`EXISTS (${exists})`
        var { sql, params } = q.build()

        expect(str(sql)).toEndWith(`WHERE EXISTS (SELECT * FROM "Order" WHERE "contactId" = $_1 && "freightId" = 1)`)
        expect(params).toEqual({ _1: 1 })

        const city = 'Austin'
        var q = $.from(Contact).where(c => $`${c.city} = ${city}`).and`EXISTS (${exists})`
        var { sql, params } = q.build()

        expect(str(sql)).toEndWith(`WHERE "city" = $_1 AND EXISTS (SELECT * FROM "Order" WHERE "contactId" = $_2 && "freightId" = 1)`)
        expect(params).toEqual({ _1: 'Austin', _2: 1 })

        var q = $.from(Contact).where(c => $`${c.city} = ${city}`).and`EXISTS (${exists})`
        var { sql, params } = q.build()

        expect(str(sql)).toEndWith(`WHERE "city" = $_1 AND EXISTS (SELECT * FROM "Order" WHERE "contactId" = $_2 && "freightId" = 1)`)
        expect(params).toEqual({ _1: 'Austin', _2: 1 })

        const age = 27
        var q = $.from(Contact).where(c => $`${c.city} = ${city}`).and`EXISTS (${exists})`.and(c => $`${c.age} = ${age}`)
        var { sql, params } = q.build()

        expect(str(sql)).toEndWith(`WHERE "city" = $_1 AND EXISTS (SELECT * FROM "Order" WHERE "contactId" = $_2 && "freightId" = 1) AND "age" = $_3`)
        expect(params).toEqual({ _1: 'Austin', _2: 1, _3: 27 })
    })

    it ('Can embed EXISTS fragment on Contact', () => {

        const contactId = 1
        const city = 'Austin'
        const age = 27
        const exists = $.from(Order)
            .where(o => $`${o.contactId} = ${contactId} && ${o.freightId} = 1`)
            .select('*')

        const existsFragment = exists.build()
        var q = $.from(Contact).where(c => $`${c.city} = ${city}`).and`EXISTS (${existsFragment})`.and(c => $`${c.age} = ${age}`)
        var { sql, params } = q.build()

        expect(str(sql)).toEndWith(`WHERE "city" = $_1 AND EXISTS (SELECT * FROM "Order" WHERE "contactId" = $_2 && "freightId" = 1) AND "age" = $_3`)
        expect(params).toEqual({ _1: 'Austin', _2: 1, _3: 27 })
    })

})
