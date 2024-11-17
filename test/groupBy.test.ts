import { describe, it, expect } from 'bun:test'
import { sqlite as $ } from '../src'
import { Contact, Order, OrderItem } from './data'
import { str } from './utils'

describe('SQLite GROUP BY Tests', () => {

    it ('can groupBy Contacts and Orders', () => {

        const expected = str(`SELECT "Contact"."firstName", SUM("Order"."total") 
             FROM "Contact" 
             JOIN "Order" ON "Contact"."id" = "Order"."contactId" 
            GROUP BY "Contact"."firstName"`)
        
        const contactTotals = $.from(Contact)
            .join(Order, { on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .select((c, o) => $`${c.firstName}, SUM(${o.total})`)
        
        expect(str(contactTotals.clone().groupBy(c => $`${c.firstName}`))).toBe(expected)

        const q = contactTotals.clone()
        const c = q.ref
        expect(str(q.groupBy`${c.firstName}`)).toBe(expected)

        expect(str(contactTotals.clone()
            .groupBy($.groupBy(Contact).add(c => $`${c.firstName}`)))).toBe(expected)
        expect(str(contactTotals.clone()
            .groupBy($.groupBy(Contact).add`${c.firstName}`))).toBe(expected)
    })

    it ('Can multiple groupBy Contacts and Orders', () => {

        const expected = str(`SELECT "Contact"."firstName", "Contact"."city", SUM("Order"."total") 
             FROM "Contact" 
             JOIN "Order" ON "Contact"."id" = "Order"."contactId" 
            GROUP BY "Contact"."firstName", "Contact"."city"`)
        
        const q = $
            .from(Contact)
            .join(Order, { on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .select((c, o) => $`${c.firstName}, ${c.city}, SUM(${o.total})`)
        
        expect(str(q.clone().groupBy(c => $`${c.firstName}, ${c.city}`))).toBe(expected)
        expect(str(q.clone().groupBy(c => $`${c.firstName}`).groupBy(c => $`${c.city}`))).toBe(expected)

        const c = q.ref
        expect(str(q.clone().groupBy`${c.firstName}, ${c.city}`)).toBe(expected)
        expect(str(q.clone().groupBy`${c.firstName}`.groupBy`${c.city}`)).toBe(expected)

        expect(str(q.clone()
            .groupBy($.groupBy(Contact).add(c => $`${c.firstName}`).add(c => $`${c.city}`)))).toBe(expected)
        expect(str(q.clone()
            .groupBy($.groupBy(Contact).add`${c.firstName}`.add`${c.city}`))).toBe(expected)
    })

    it ('Can multiple groupBy Contacts and Orders from multiple tables', () => {

        const expected = str(`SELECT "Contact"."firstName", "Order"."freightId", SUM("Order"."total") 
             FROM "Contact" 
             JOIN "Order" ON "Contact"."id" = "Order"."contactId" 
            GROUP BY "Contact"."firstName", "Order"."freightId"`)
        
        const q = $
            .from(Contact)
            .join(Order, { on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .select((c, o) => $`${c.firstName}, ${o.freightId}, SUM(${o.total})`)
        
        expect(str(q.clone().groupBy((c,o) => $`${c.firstName}, ${o.freightId}`))).toBe(expected)
        expect(str(q.clone().groupBy(c => $`${c.firstName}`).groupBy((_,o) => $`${o.freightId}`))).toBe(expected)

        const [ c, o ] = q.refs
        expect(str(q.clone().groupBy`${c.firstName}, ${o.freightId}`)).toBe(expected)
        expect(str(q.clone().groupBy`${c.firstName}`.groupBy`${o.freightId}`)).toBe(expected)

        expect(str(q.clone()
            .groupBy($.groupBy(Contact,Order).add((c,o) => $`${c.firstName}, ${o.freightId}`)))).toBe(expected)
        expect(str(q.clone()
            .groupBy($.groupBy(Contact,Order).add(c => $`${c.firstName}`).add((_,o) => $`${o.freightId}`)))).toBe(expected)
        expect(str(q.clone()
            .groupBy($.groupBy(Contact,Order).add`${c.firstName}`.add`${o.freightId}`))).toBe(expected)
    })

    it ('Can multiple groupBy Contacts and Orders from multiple tables using aliases', () => {

        const expected = str(`SELECT c."firstName", o."freightId", SUM(o."total") 
             FROM "Contact" c 
             JOIN "Order" o ON c."id" = o."contactId" 
            GROUP BY c."firstName", o."freightId"`)
        
        const q = $
            .from(Contact,'c')
            .join(Order, { as:'o', on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .select((c, o) => $`${c.firstName}, ${o.freightId}, SUM(${o.total})`)
        
        expect(str(q.clone().groupBy((c,o) => $`${c.firstName}, ${o.freightId}`))).toBe(expected)
        expect(str(q.clone().groupBy(c => $`${c.firstName}`).groupBy((_,o) => $`${o.freightId}`))).toBe(expected)

        const [ c, o ] = q.refs
        expect(str(q.clone().groupBy`${c.firstName}, ${o.freightId}`)).toBe(expected)
        expect(str(q.clone().groupBy`${c.firstName}`.groupBy`${o.freightId}`)).toBe(expected)

        expect(str(q.clone()
            .groupBy($.groupBy(Contact,Order).add((c,o) => $`${c.firstName}, ${o.freightId}`)))).toBe(expected)
        expect(str(q.clone()
            .groupBy($.groupBy(Contact,Order).add(c => $`${c.firstName}`).add((_,o) => $`${o.freightId}`)))).toBe(expected)
        expect(str(q.clone()
            .groupBy($.groupBy(Contact,Order).add`${c.firstName}`.add`${o.freightId}`))).toBe(expected)
    })

    it ('Can use groupBy builder on out of order tables', () => {

        expect(str($.from(Contact,'c')
            .join(Order, { as:'o', on:(c,o) => $`${c.id} = ${o.contactId}` })
            .join(OrderItem, { as:'i', on:(o,i) => $`${o.id} = ${i.orderId}` })
            .groupBy(
                $.groupBy(Contact,OrderItem)
                    .add((c,i) => $`${c.firstName}, ${i.name}`)
            )
            .select((c,o,i) => $`${c.firstName}, ${i.name}, SUM(${o.total}) AS total`)))
        .toEqual(str(`SELECT c."firstName", i."name", SUM(o."total") AS total 
            FROM "Contact" c 
            JOIN "Order" o ON c."id" = o."contactId" 
            JOIN "OrderItem" i ON o."id" = i."orderId" 
            GROUP BY c."firstName", i."name"`))
    })

})
