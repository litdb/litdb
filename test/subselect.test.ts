import { describe, it, expect } from 'bun:test'
import { sqlite as $ } from '../src'
import { Contact, Order, OrderItem } from './data'
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

})
