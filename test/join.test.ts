import { describe, it, expect } from 'bun:test'
import { sqlite as $ } from '../src'
import { Contact, Freight, Order, OrderItem } from './data'
import { str } from './utils'

describe('SQLite JOIN Tests', () => {

    it ('Can join multiple tables', () => {
        let q1 = $.from(Contact).as('c')
        let q2 = q1.join(Order, { on:(c, o) => $`${c.id} = ${o.contactId}` })
        let q3 = q2.join(OrderItem, { on:(o:Order, i:OrderItem, c:Contact) => $`${o.id} = ${i.orderId}` })
        expect(q3.tables).toEqual([Contact, Order, OrderItem])
        
        expect(str($.from(Contact).as('c').join(Order, { on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })))
            .toContain(`FROM "Contact" c JOIN "Order" ON c."id" = "Order"."contactId"`)
        
        expect(str($.from(Contact).as('c')
            .join(Order, { on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .join(OrderItem, { on:(o:Order, i:OrderItem) => $`${o.id} = ${i.orderId}` })))
            .toContain(`FROM "Contact" c JOIN "Order" ON c."id" = "Order"."contactId" JOIN "OrderItem" ON "Order"."id" = "OrderItem"."orderId"`)
        
        expect(str($.from(Contact).as('c')
            .join(Order, { on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .join(OrderItem, { on:(o:Order, i:OrderItem) => $`${o.id} = ${i.orderId}` })
            .join($.join(Freight,Order).leftJoin((f, o) => $`${o.freightId} = ${f.id}`))
            .select('*')
        )).toContain(`FROM "Contact" c JOIN "Order" ON c."id" = "Order"."contactId" JOIN "OrderItem" ON "Order"."id" = "OrderItem"."orderId" LEFT JOIN "Freight" ON "Order"."freightId" = "Freight"."id"`)

        expect(str($.from(Contact).as('c')
            .join(Order, { on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .join($.join(OrderItem,Order,Freight).as('i')
                .leftJoin((i, o, f) => $`${o.id} = ${i.orderId} LEFT JOIN ${f} ON ${o.freightId} = ${f.id}`))
            .select('*')
        )).toContain(`FROM "Contact" c JOIN "Order" ON c."id" = "Order"."contactId"`
            + ' LEFT JOIN "OrderItem" i ON "Order"."id" = i."orderId"'
            + ' LEFT JOIN "Freight" ON "Order"."freightId" = "Freight"."id"'
        )
        expect(str($.from(Contact).as('c')
            .join($.join(Order,OrderItem,Freight,Contact)
                .join((o, i, f, c) => $`${c.id} = ${o.contactId} JOIN ${i} ON ${o.id} = ${i.orderId} LEFT JOIN ${f} ON ${o.freightId} = ${f.id}`))
            .select('*')
        )).toContain(`FROM "Contact" c JOIN "Order" ON c."id" = "Order"."contactId"`
            + ' JOIN "OrderItem" ON "Order"."id" = "OrderItem"."orderId"'
            + ' LEFT JOIN "Freight" ON "Order"."freightId" = "Freight"."id"'
        )
    })

    it ('Can select multiple joined tables with alias', () => {

        const expectedSql 
            = 'FROM "Contact" c JOIN "Order" ON c."id" = "Order"."contactId"' 
            + ' JOIN "OrderItem" ON "Order"."id" = "OrderItem"."orderId"' 
            + ' LEFT JOIN "Freight" ON "Order"."freightId" = "Freight"."id"'

        expect(str($.from(Contact,'c')
            .join(Order, { on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .join(OrderItem, { on:(o:Order, i:OrderItem) => $`${o.id} = ${i.orderId}` })
            .join($.join(Freight,Order).leftJoin((f, o) => $`${o.freightId} = ${f.id}`))
            .select((c, o, i, f) => $`${c.firstName}, ${o.contactId}, ${i.orderId}, ${f.name}`)))
        .toContain(expectedSql)

        expect(str($.from(Contact).as('c')
            .join(Order, { on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
            .join(OrderItem, { on:(o:Order, i:OrderItem) => $`${o.id} = ${i.orderId}` })
            .join($.join(Freight,Order).leftJoin((f, o) => $`${o.freightId} = ${f.id}`))
            .select((c, o, i, f) => $`${c.firstName}, ${o.contactId}, ${i.orderId}, ${f.name}`)))
        .toContain(expectedSql)
    })

    it ('select multiple joined tables with only references', () => {

        const [ c, o, i, f ] = [ $.ref(Contact,'c'), $.ref(Order,'o'), $.ref(OrderItem,'i'), $.ref(Freight,'f') ]
        expect(str($.from(c)
            .join(o, $`${c.id} = ${o.contactId}`)
            .join(i, $`${o.id} = ${i.orderId}`)
            .leftJoin(f, $`${o.freightId} = ${f.id}`)
            .select`${c.firstName}, ${o.contactId}, ${i.orderId}, ${f.name}`
        ))
        .toContain('SELECT c."firstName", o."contactId", i."orderId", f."name"' 
            + ' FROM "Contact" c JOIN "Order" o ON c."id" = o."contactId"' 
            + ' JOIN "OrderItem" i ON o."id" = i."orderId"' 
            + ' LEFT JOIN "Freight" f ON o."freightId" = f."id"')
    })

})
