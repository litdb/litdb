import { describe, it, expect } from 'bun:test'
import { sqlite as $ } from '../src'
import { Contact, customerOrderTables, Order, OrderItem } from './data'
import { str } from './utils'

describe.only('SQLite SUB SELECT Tests', () => {

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

    it ('Can compose fragments and builders', () => {
        const byId = (id:number) => $.sql('id = $id', { id })

        expect(str($.update(Contact).set({ age:41, city:'Austin' }).where(byId(1))))
            .toEqual(str(`UPDATE "Contact" SET "age" = $age, "city" = $city WHERE id = $id`))

        expect(str($.update(Contact).set({ age:41, city:'Austin' }).where($.idEquals(1))))
            .toEqual(str(`UPDATE "Contact" SET "age" = $age, "city" = $city WHERE "id" = $id`))

        const hasId = $.idEquals
        // const hasId = <Table extends { id:number }>(id:number) => 
        //     (x:Table) => $.sql($`${x.id} = $id`, { id })

        const id = 10
        var { sql, params } = $.from(Contact).where(hasId(id)).build()
        expect(sql).toContain(`WHERE "id" = $id`)
        expect(params).toEqual({ id })

        // @ts-ignore
        // fails at preview, build + run time before hits db
        // var { sql, params } = $.from(Person).where(hasId(id)).build() 

        const contactOrderItems = (() => {
            const q = $.from(Contact,'c')
                .join(Order, { as:'o', on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
                .join(OrderItem, { as:'i', on:(o:Order, i:OrderItem) => $`${o.id} = ${i.orderId}` })
            return () => q.clone()
        })()

        const [q1, q2, q3, q4] = [...Array(4)].map(contactOrderItems)
        const [ c, o, i ] = q1.refs

        expect(str(q1.where`${c.id} = ${id}`)).toEndWith(`WHERE c."id" = $_1`)
        expect(str(q2.where`${o.contactId} = ${id}`)).toEndWith(`WHERE o."contactId" = $_1`)
        expect(str(q3.where`${i.orderId} = ${10}`)).toEndWith(`WHERE i."orderId" = $_1`)

        const now = new Date()
        const monthAgo = new Date(new Date().setDate(now.getDate() - 30))
        
        const newAndHighPurchase = (c:Contact,o:Order) => $`${c.createdAt} > ${monthAgo} && ${o.total} + ${1000}`
        expect(str(q4.where(newAndHighPurchase))).toEndWith(`WHERE c."createdAt" > $_1 && o."total" + $_2`)
    })

    it ('does rewrite offset limit in sub selects', () => {
        
        const { Product, Contact, Order, OrderItem } = customerOrderTables()

        const hotProducts = ['WIDGET', 'GADGET', 'THING', 'GIZMO', 'DOODAD']
        const qHot = $.from(OrderItem)
            .where(i => $`${i.sku} IN (${hotProducts})`)
            .groupBy(i => $`${i.id}`)
            .orderBy(i => $`SUM(${i.qty}) DESC`)
            .select(i => $`${i.id}`)
            .limit(10,20)
    
        const contactIds = [1,2,3]
        const q = $.from(Order, 'o')
            .leftJoin(Contact, { on:(o,c) => $`${c.id} = ${o.contactId}`, as:'c'})
            .join(OrderItem,   { on:(_,i,o) => $`${o.id} = ${i.orderId}`, as:'i'})
            .leftJoin(Product, { on:(i,p) => $`${i.sku} = ${p.id}`, as:'p' })
            .where((o,c,i,p) => $`${o.contactId} IN (${contactIds}) AND ${p.cost} >= ${1000}`)
            .or((o,c,i) => $`${i.id} IN (${qHot})`)
            .select((o,c,i,p) => $`${c.name}, ${o.id}, ${p.name}, ${p.cost}, ${i.qty}, ${i.total}, ${o.total}`)
            .orderBy(o => $`${o.total}`)
            .limit(50, 100)

        // $.log(q)
        expect(str(q.toString()))
            .toEqual(str(`SELECT c."name", o."id", p."name", p."cost", i."qty", i."total", o."total" 
                 FROM "Order" o 
                 LEFT JOIN "Contact" c ON c."id" = o."contactId" 
                 JOIN "OrderItem" i ON o."id" = i."orderId" 
                 LEFT JOIN "Product" p ON i."sku" = p."sku" 
                WHERE o."contactId" IN ($_1,$_2,$_3) AND p."cost" >= $_4 
                   OR i."id" IN (SELECT "id" 
                                   FROM "OrderItem" 
                                  WHERE "sku" IN ($_5,$_6,$_7,$_8,$_9) 
                                  GROUP BY "id" 
                                  ORDER BY SUM("qty") DESC 
                                  LIMIT $_10 OFFSET $_11) 
                ORDER BY o."total" 
                LIMIT $limit 
                OFFSET $offset 
                PARAMS {
                   _1: 1, 
                   _2: 2, 
                   _3: 3, 
                   _4: 1000, 
                   _5: WIDGET, 
                   _6: GADGET, 
                   _7: THING, 
                   _8: GIZMO, 
                   _9: DOODAD, 
                  _10: 10, 
                  _11: 20, 
                limit: 50, 
               offset: 100 
                }`))
    })

    it ('Can create queries with multiple sub selects and external references', () => {

        const { Contact, Order } = customerOrderTables()

        const [ c, o ] = [ $.ref(Contact,'c'), $.ref(Order,'o') ]

        const now = new Date()
        const monthAgo = new Date(now.setDate(now.getDate()-30)).toISOString().split('T')[0]
        const last30Days = $.from(Order,'o2')
            .where(o2 => $`${o2.contactId} = ${c.id}`)
            .and(o2 => $`${o2.createdAt} >= ${monthAgo}`)
            .select(o2 => $`COUNT(${o2.id})`)

        const recentOrder = $.from(Order,'o3')
            .where(o3 => $`${o3.contactId} = ${c.id}`)
            .select(o3 => $`MAX(${o3.createdAt})`)

        // Example of SQL Fragment with parameter
        const startOfYear = `2024-01-01`
        const o4 = $.ref(Order,'o4')
        const totalOrders = $`SELECT SUM(${o4.total}) 
             FROM ${o4} o4 
            WHERE ${o4.contactId} = ${c.id} 
              AND ${o4.createdAt} >= ${startOfYear}`

        const q = $.from(c)    
            .join(o, { on:(c,o) => $`${c.id} = ${o.contactId}`})
            .where`${o.createdAt} = (${recentOrder})`
            .select`
                ${c.id}, 
                ${c.name}, 
                ${o.createdAt} AS recentOrder, 
                (${last30Days}) AS last30Days,
                (${totalOrders}) AS totalOrders`
            .orderBy`last30Days DESC`

        // $.log(q)
        expect(str(q.toString())).toBe(str(`
        SELECT c."id", 
               c."name", 
               o."createdAt" AS recentOrder, 
               (SELECT COUNT(o2."id")
                  FROM "Order" o2
                 WHERE o2."contactId" = c."id"
                   AND o2."createdAt" >= $_1) AS last30Days,
               (SELECT SUM(o4."total") 
                  FROM "Order" o4
                 WHERE o4."contactId" = c."id" 
                   AND o4."createdAt" >= $_2) AS totalOrders
         FROM "Contact" c
         JOIN "Order" o ON c."id" = o."contactId"
        WHERE o."createdAt" = (SELECT MAX(o3."createdAt")
                FROM "Order" o3
                WHERE o3."contactId" = c."id")
        ORDER BY last30Days DESC
        PARAMS {
            _1: ${monthAgo},
            _2: ${startOfYear}
        }`))
    })

})
