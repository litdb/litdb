import { describe, it, expect } from 'bun:test'
import { Contact, Order } from './data'
import { sync as db, $ } from './db'
import { str } from './utils'

describe('SQLite SUB SELECT Tests', () => {

    it ('Can embed EXISTS builder on Contact', () => {
        const contactId = 1
        const exists = db.from(Order)
            .where(o => $`${o.contactId} == ${contactId} && ${o.freightId} = 1`)
            .select('*')

        var q = db.from(Contact).where`EXISTS (${exists})`
        var { sql, params } = q.build()

        expect(str(sql)).toEndWith(`WHERE EXISTS (SELECT * FROM "Order" WHERE "contactId" == $1 && "freightId" = 1)`)
        expect(params).toEqual({ '1': 1 })

        const city = 'Austin'
        var q = db.from(Contact).where(c => $`${c.city} = ${city}`).and`EXISTS (${exists})`
        var { sql, params } = q.build()

        expect(str(sql)).toEndWith(`WHERE "city" = $1 AND EXISTS (SELECT * FROM "Order" WHERE "contactId" == $2 && "freightId" = 1)`)
        expect(params).toEqual({ '1': 'Austin', '2': 1 })

        var q = db.from(Contact).where(c => $`${c.city} = ${city}`).and`EXISTS (${exists})`
        var { sql, params } = q.build()

        expect(str(sql)).toEndWith(`WHERE "city" = $1 AND EXISTS (SELECT * FROM "Order" WHERE "contactId" == $2 && "freightId" = 1)`)
        expect(params).toEqual({ '1': 'Austin', '2': 1 })

        const age = 27
        var q = db.from(Contact).where(c => $`${c.city} = ${city}`).and`EXISTS (${exists})`.and(c => $`${c.age} = ${age}`)
        var { sql, params } = q.build()

        expect(str(sql)).toEndWith(`WHERE "city" = $1 AND EXISTS (SELECT * FROM "Order" WHERE "contactId" == $2 && "freightId" = 1) AND "age" = $3`)
        expect(params).toEqual({ '1': 'Austin', '2': 1, '3': 27 })
    })

    it ('Can embed EXISTS fragment on Contact', () => {

        const contactId = 1
        const city = 'Austin'
        const age = 27
        const exists = db.from(Order)
            .where(o => $`${o.contactId} == ${contactId} && ${o.freightId} = 1`)
            .select('*')

        const existsFragment = exists.build()
        var q = db.from(Contact).where(c => $`${c.city} = ${city}`).and`EXISTS (${existsFragment})`.and(c => $`${c.age} = ${age}`)
        var { sql, params } = q.build()

        expect(str(sql)).toEndWith(`WHERE "city" = $1 AND EXISTS (SELECT * FROM "Order" WHERE "contactId" == $2 && "freightId" = 1) AND "age" = $3`)
        expect(params).toEqual({ '1': 'Austin', '2': 1, '3': 27 })
    })

})
