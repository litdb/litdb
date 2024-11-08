import { describe, it, expect } from 'bun:test'
import { sqlite as $, column, table } from '../src'
import { Contact, Order, OrderItem } from './data'
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

    it ('Can compose fragments and builders', () => {
        const byId = (id:number) => $.fragment('id = $id', { id })

        expect(str($.update(Contact).set({ age:41, city:'Austin' }).where(byId(1))))
            .toEqual(str(`UPDATE "Contact" SET "age" = $age, "city" = $city WHERE id = $id`))

        expect(str($.update(Contact).set({ age:41, city:'Austin' }).where($.idEquals(1))))
            .toEqual(str(`UPDATE "Contact" SET "age" = $age, "city" = $city WHERE "id" = $id`))

        const hasId = $.idEquals
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
        
        @table() class Product {
            @column("INTEGER", { autoIncrement:true, alias:'sku' }) id = ''
            @column("TEXT",    { required:true }) name = ''
            @column("MONEY",   { required:true }) cost = 0.0
        }
        @table() class Contact {
            @column("INTEGER",  { autoIncrement:true }) id = 0
            @column("TEXT",     { required:true }) name = ''
            @column("TEXT",     { required:true, index:true, unique:true }) email = ''
            @column("DATETIME", { defaultValue:"CURRENT_TIMESTAMP" }) createdAt = new Date()
        }
        @table() class Order {
            @column("INTEGER",  { autoIncrement:true }) id = 0
            @column("INTEGER",  { references:{ table:Contact, on:["DELETE","CASCADE"] } }) contactId = 0
            @column("MONEY")    total = 0.0
            @column("DATETIME", { defaultValue:"CURRENT_TIMESTAMP" }) createdAt = new Date()
        }
        @table() class OrderItem {
            @column("INTEGER", { autoIncrement:true }) id = 0
            @column("INTEGER", { references:{ table:Order, on:["DELETE","RESTRICT"] } }) orderId = 0
            @column("INTEGER", { references:{ table:Product } }) sku = ''
            @column("INTEGER") qty = 0
            @column("MONEY")   total = 0.0
        }

        const qHot = $.from(OrderItem)
            .groupBy(i => $`${i.id}`)
            .orderBy(i => $`SUM(${i.qty}) DESC`)
            .limit(10,20)
    
        const contactIds = [1,2,3]
        const q = $.from(Order, 'o')
            .leftJoin(Contact, { on:(o,c) => $`${c.id} = ${o.contactId}`, as:'c'})
            .join(OrderItem,   { on:(_,i,o) => $`${o.id} = ${i.orderId}`, as:'i'})
            .leftJoin(Product, { on:(i,p) => $`${i.sku} = ${p.id}`, as:'p' })
            .where((o,c,i,p) => $`${o.contactId} IN (${contactIds}) AND ${p.cost} >= ${1000}`)
            .or((o,c,i) => $`${i.sku} IN (${qHot})`)
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
                    OR i."sku" IN (SELECT "id", "orderId", "sku", "qty", "total"
                        FROM "OrderItem"
                    GROUP BY "id"
                    ORDER BY SUM("qty") DESC
                    LIMIT $_5 OFFSET $_6)
                ORDER BY o."total"
                LIMIT $limit OFFSET $offset
                PARAMS {
                    _1: 1,
                    _2: 2,
                    _3: 3,
                    _4: 1000,
                    _6: 20,
                    _5: 10,
                    offset: 100,
                    limit: 50
                }`))
    })

})
