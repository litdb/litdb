import { describe, it, expect } from 'bun:test'
import type { SqlBuilder } from '../src/types'
import { sqlite as $ } from '../src'
import { Contact, DynamicPerson, Order, Person } from './data'
import { str } from './utils'

describe('SQLite SelectQuery Tests', () => {

    it (`Can select custom fields from Contact`, () => {
        expect(str($.from(Contact).select('*'))).toContain('*')
        expect(str($.from(Contact).select('id,city'))).toContain('id,city')
        expect(str($.from(Contact).select`id,city`)).toContain('id,city')
        expect(str($.from(Contact).select({
            columns: ['id', 'city']
        }))).toContain('"id", "city"')
        expect(str($.from(Contact).select({
            sql: $('id,city')
        }))).toContain('id,city')
        expect(str($.from(Contact).select({
            sql: [$('id'),$('city')]
        }))).toContain('id, city')
        expect(str($.from(Contact).select({
            columns: ['id', 'city']
        }))).toContain('"id", "city"')
        expect(str($.from(Contact).select({
            props: ['id', 'city']
        }))).toContain('"id", "city"')
        expect(str($.from(Contact).select(
            (c:Contact) => $`${c.id}, ${c.city}`)
        )).toContain('"id", "city"')
        const p = $.ref(Person,'')
        expect(str($.from(Contact).select(
            (c:Contact) => $`${c.id}, ${c.city}, ${p.surname}`)
        )).toContain('"id", "city", "lastName"')
        expect(str($.from(Contact).as('c').select(
            (c:Contact) => $`${c.id}, ${c.city}`)
        )).toContain('c."id", c."city"')
    })

    it (`Can select custom fields from Person`, () => {
        expect(str($.from(Person).select('*'))).toContain('*')
        expect(str($.from(Person).select('id,email'))).toContain('id,email')
        expect(str($.from(Person).select`id,email`)).toContain('id,email')
        expect(str($.from(Person).select({
            columns: ['id','email']
        }))).toContain('"id", "email"')
        expect(str($.from(Person).select({
            sql: $('id,email')
        }))).toContain('id,email')
        expect(str($.from(Person).select({
            sql: [$('id'),$('email')]
        }))).toContain('id, email')
        expect(str($.from(Person).select({
            columns: ['id', 'email']
        }))).toContain('"id", "email"')
        expect(str($.from(Person).select({
            props: ['key', 'name']
        }))).toContain('"id", "firstName"')
        expect(str($.from(Person).select(
            (c:Person) => $`${c.key}, ${c.name}`)
        )).toContain('"id", "firstName"')
        
        const c = $.ref(Contact,'')
        expect(str($.from(Person).select(
            (p:Person) => $`${p.key}, ${p.name}, ${c.city}`)
        )).toContain('"id", "firstName", "city"')
        expect(str($.from(Person).as('p').select(
            (p:Person) => $`${p.key}, ${p.name}`)
        )).toContain('p."id", p."firstName"')
    })

    it (`Can select custom fields from DynamicPerson`, () => {
        expect(str($.from(DynamicPerson).select('*'))).toContain('*')
        expect(str($.from(DynamicPerson).select('id,email'))).toContain('id,email')
        expect(str($.from(DynamicPerson).select`id,email`)).toContain('id,email')
        expect(str($.from(DynamicPerson).select({
            columns: ['id', 'email']
        }))).toContain('"id", "email"')
        expect(str($.from(DynamicPerson).select({
            sql: $('id,email')
        }))).toContain('id,email')
        expect(str($.from(DynamicPerson).select({
            sql: [$('id'),$('email')]
        }))).toContain('id, email')
        expect(str($.from(DynamicPerson).select({
            columns: ['id', 'email']
        }))).toContain('"id", "email"')
        expect(str($.from(DynamicPerson).select({
            props: ['key', 'name']
        }))).toContain('"id", "firstName"')
        expect(str($.from(DynamicPerson).select(
            (c:DynamicPerson) => $`${c.key}, ${c.name}`)
        )).toContain('"id", "firstName"')

        const c = $.ref(Contact,'')
        expect(str($.from(DynamicPerson).select(
            (p:DynamicPerson) => $`${p.key}, ${p.name}, ${c.city}`)
        )).toContain('"id", "firstName", "city"')
        expect(str($.from(Person).as('p').select(
            (p:DynamicPerson) => $`${p.key}, ${p.name}`)
        )).toContain('p."id", p."firstName"')
    })

    it ('Can select columns with variables', () => {
        function assert(q:SqlBuilder, sqlContains:string, expectedParams:any) {
            const { sql, params } = q.build()
            expect(str(sql)).toContain(sqlContains)
            expect(params).toEqual(expectedParams)
        }

        assert($.from(Order).select((o:Order) => $`COUNT(${o.qty}) as count`), 
            `COUNT("qty") as count`, {})
        
        const contactId = 1
        const freightId = 2
        const multiplier = 3
        assert($.from(Order).select((o:Order) => $`COUNT(${o.qty}) * ${multiplier} as count`), 
            `COUNT("qty") * $1 as count`, { [1]:multiplier })

        assert($.from(Order)
            .where((o:Order) => $`${o.freightId} = ${freightId}`)
            .and((o:Order) => $`${o.contactId} = ${contactId}`)
            .select((o:Order) => $`COUNT(${o.qty}) * ${multiplier} as count`), 
            `SELECT COUNT(\"qty\") * $3 as count FROM \"Order\" WHERE \"freightId\" = $1 AND \"contactId\" = $2`, 
            { [1]:freightId, [2]:contactId, [3]:multiplier })

        assert($.from(Order)
            .join(Contact, { 
                on:(o:Order, c:Contact) => $`${o.contactId} = ${c.id} AND ${c.id} = ${contactId}` 
            })
            .where((o:Order) => $`${o.freightId} = ${freightId}`)
            .select((o:Order) => $`COUNT(${o.qty}) * ${multiplier} as count`), 
            `SELECT COUNT("Order"."qty") * $3 as count FROM "Order" JOIN "Contact" ON "Order"."contactId" = "Contact"."id" AND "Contact"."id" = $1 WHERE "Order"."freightId" = $2`, 
            { [1]:contactId, [2]:freightId, [3]:multiplier })
    })

    it ('Can query with just refs', () => {
        function assert(q:SqlBuilder, sqlContains:string, expectedParams:any) {
            const { sql, params } = q.build()
            expect(sql.replaceAll('\n','')).toContain(sqlContains)
            expect(params).toEqual(expectedParams)
        }

        const contactId = 1
        const freightId = 2
        const multiplier = 3

        ;((expectedSql, expectedParams) => {
            
            var q = $.from(Order)
            var [o, c] = $.refs(Order,Contact)

            q = q.join(Contact, { 
                on:() => $`${o.contactId} = ${c.id}` 
            })

            var [o,c] = q.refsOf(Order,Contact)

            assert(q
                .where(() => $`${c.id} = ${contactId} AND ${o.freightId} = ${freightId}`)
                .select(() => $`COUNT(${o.qty}) * ${multiplier} as count`),
                expectedSql, expectedParams)

            var q = $.from(Order)
            var [o, c] = $.refs(Order,Contact)
    
            assert(q
                //.join(c).on`${o.contactId} = ${c.id}`
                .join(Contact, { 
                    on:() => $`${o.contactId} = ${c.id}` 
                })
                .where`${c.id} = ${contactId} AND ${o.freightId} = ${freightId}`
                .select`COUNT(${o.qty}) * ${multiplier} as count`,
                expectedSql, expectedParams)

        })(
            'SELECT COUNT("Order"."qty") * $3 as count  FROM "Order"' 
            + '  JOIN "Contact" ON "Order"."contactId" = "Contact"."id"' 
            + ' WHERE "Contact"."id" = $1 AND "Order"."freightId" = $2',
            { [1]:contactId, [2]:freightId, [3]:multiplier }
        )

        assert($.from(Order)
            .join(Contact, { 
                on:(o:Order, c:Contact) => $`${o.contactId} = ${c.id} AND ${c.id} = ${contactId}` 
            })
            .where((o:Order) => $`${o.freightId} = ${freightId}`)
            .select((o:Order) => $`COUNT(${o.qty}) * ${multiplier} as count`), 
            `SELECT COUNT("Order"."qty") * $3 as count  FROM "Order"  JOIN "Contact" ON "Order"."contactId" = "Contact"."id" AND "Contact"."id" = $1 WHERE "Order"."freightId" = $2`, 
            { [1]:contactId, [2]:freightId, [3]:multiplier })
    })
})
