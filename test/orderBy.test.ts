import { describe, it, expect } from 'bun:test'
import { Contact, Order } from './data'
import { $, sync as db } from './db'
import { str } from './utils'

describe('SQLite ORDER BY Tests', () => {

    it ('can orderBy Contacts and Orders', () => {

        const expected = 'SELECT "Contact"."firstName", "Order"."total"' 
            + '  FROM "Contact"' 
            + '  JOIN "Order" ON "Contact"."id" = "Order"."contactId"' 
            + ' ORDER BY "Contact"."firstName"'
        
        const contactTotals = db
            .from(Contact)
            .join(Order, { on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .select((c, o) => $`${c.firstName}, ${o.total}`)
        
        expect(str(contactTotals.clone().orderBy(c => $`${c.firstName}`))).toBe(expected)

        const q = contactTotals.clone()
        const c = q.ref
        expect(str(q.orderBy`${c.firstName}`)).toBe(expected)

        expect(str(contactTotals.clone()
            .orderBy($.orderBy(Contact).add(c => $`${c.firstName}`)))).toBe(expected)
        expect(str(contactTotals.clone()
            .orderBy($.orderBy(Contact).add`${c.firstName}`))).toBe(expected)
    })

    it ('Can multiple orderBy Contacts and Orders', () => {

        const expected = 'SELECT "Contact"."firstName", "Contact"."city", "Order"."total"' 
            + '  FROM "Contact"' 
            + '  JOIN "Order" ON "Contact"."id" = "Order"."contactId"' 
            + ' ORDER BY "Contact"."firstName", "Contact"."city"'
        
        const q = db
            .from(Contact)
            .join(Order, { on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .select((c, o) => $`${c.firstName}, ${c.city}, ${o.total}`)
        
        expect(str(q.clone().orderBy(c => $`${c.firstName}, ${c.city}`))).toBe(expected)
        expect(str(q.clone().orderBy(c => $`${c.firstName}`).orderBy(c => $`${c.city}`))).toBe(expected)

        const c = q.ref
        expect(str(q.clone().orderBy`${c.firstName}, ${c.city}`)).toBe(expected)
        expect(str(q.clone().orderBy`${c.firstName}`.orderBy`${c.city}`)).toBe(expected)

        expect(str(q.clone()
            .orderBy($.orderBy(Contact).add(c => $`${c.firstName}`).add(c => $`${c.city}`)))).toBe(expected)
        expect(str(q.clone()
            .orderBy($.orderBy(Contact).add`${c.firstName}`.add`${c.city}`))).toBe(expected)
    })

    it ('Can multiple orderBy Contacts and Orders from multiple tables', () => {

        const expected = 'SELECT "Contact"."firstName", "Order"."freightId", "Order"."total"' 
            + '  FROM "Contact"' 
            + '  JOIN "Order" ON "Contact"."id" = "Order"."contactId"' 
            + ' ORDER BY "Contact"."firstName", "Order"."freightId"'
        
        const q = db
            .from(Contact)
            .join(Order, { on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .select((c, o) => $`${c.firstName}, ${o.freightId}, ${o.total}`)
        
        expect(str(q.clone().orderBy((c,o) => $`${c.firstName}, ${o.freightId}`))).toBe(expected)
        expect(str(q.clone().orderBy(c => $`${c.firstName}`).orderBy((_,o) => $`${o.freightId}`))).toBe(expected)

        const [ c, o ] = q.refs
        expect(str(q.clone().orderBy`${c.firstName}, ${o.freightId}`)).toBe(expected)
        expect(str(q.clone().orderBy`${c.firstName}`.orderBy`${o.freightId}`)).toBe(expected)

        expect(str(q.clone()
            .orderBy($.orderBy(Contact,Order).add((c,o) => $`${c.firstName}, ${o.freightId}`)))).toBe(expected)
        expect(str(q.clone()
            .orderBy($.orderBy(Contact,Order).add(c => $`${c.firstName}`).add((_,o) => $`${o.freightId}`)))).toBe(expected)
        expect(str(q.clone()
            .orderBy($.orderBy(Contact,Order).add`${c.firstName}`.add`${o.freightId}`))).toBe(expected)
    })

    it ('Can multiple orderBy Contacts and Orders from multiple tables using aliases', () => {

        const expected = 'SELECT c."firstName", o."freightId", o."total"' 
            + '  FROM "Contact" c' 
            + '  JOIN "Order" o ON c."id" = o."contactId"' 
            + ' ORDER BY c."firstName", o."freightId"'
        
        const q = db
            .from(Contact,'c')
            .join(Order, { as:'o', on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .select((c, o) => $`${c.firstName}, ${o.freightId}, ${o.total}`)
        
        expect(str(q.clone().orderBy((c,o) => $`${c.firstName}, ${o.freightId}`))).toBe(expected)
        expect(str(q.clone().orderBy(c => $`${c.firstName}`).orderBy((_,o) => $`${o.freightId}`))).toBe(expected)

        const [ c, o ] = q.refs
        expect(str(q.clone().orderBy`${c.firstName}, ${o.freightId}`)).toBe(expected)
        expect(str(q.clone().orderBy`${c.firstName}`.orderBy`${o.freightId}`)).toBe(expected)

        expect(str(q.clone()
            .orderBy($.orderBy(Contact,Order).add((c,o) => $`${c.firstName}, ${o.freightId}`)))).toBe(expected)
        expect(str(q.clone()
            .orderBy($.orderBy(Contact,Order).add(c => $`${c.firstName}`).add((_,o) => $`${o.freightId}`)))).toBe(expected)
        expect(str(q.clone()
            .orderBy($.orderBy(Contact,Order).add`${c.firstName}`.add`${o.freightId}`))).toBe(expected)
    })

})
