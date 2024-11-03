import { describe, it, expect } from 'bun:test'
import type { SqlBuilder } from '../src/types'
import { sqlite as $ } from '../src'
import { Contact, DynamicPerson, Person } from './data'
import { selectContact, selectPerson, str } from './utils'

describe('SQLite WHERE Tests', () => {

    it ('Can query recommended shorthands', () => {
        const search = {            
            firstName: 'John',
            age: 27,
            city: 'Austin'
        }

        expect(str($.from(Contact).where({ equals: search })))
            .toContain('WHERE "firstName" = $firstName AND "age" = $age AND "city" = $city')
        expect(str($.from(Contact).where({ notEquals: search })))
            .toContain('WHERE "firstName" <> $firstName AND "age" <> $age AND "city" <> $city')
        expect(str($.from(Contact).where({ like: { firstName:'John', city:'Austin' } })))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(str($.from(Contact).where({ notLike: { firstName:'John', city:'Austin' } })))
            .toContain('WHERE "firstName" NOT LIKE $firstName AND "city" NOT LIKE $city')
        
        var { sql, params } = $.from(Contact).where({ startsWith: { firstName:'J', city:'A' } }).build()
        expect(str(sql))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(params)
            .toEqual({ firstName:'J%', city:'A%' })
        
        var { sql, params } = $.from(Contact).where({ endsWith: { firstName:'n', city:'n' } }).build()
        expect(str(sql))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(params)
            .toEqual({ firstName:'%n', city:'%n' })
        
        var { sql, params } = $.from(Contact).where({ contains: { firstName:'oh', city:'usti' } }).build()
        expect(str(sql))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(params)
            .toEqual({ firstName:'%oh%', city:'%usti%' })

        expect(str($.from(Contact).where({ in: { id:[10,20,30] } })))
            .toContain('WHERE "id" IN ($1,$2,$3)')

        expect(str($.from(Contact).where({ notIn: { id:[10,20,30] } })))
            .toContain('WHERE "id" NOT IN ($1,$2,$3)')

        expect(str($.from(Contact).where({ isNull: Object.keys(search) })))
            .toContain('WHERE "firstName" IS NULL AND "age" IS NULL AND "city" IS NULL')

        expect(str($.from(Contact).where({ notNull: Object.keys(search) })))
            .toContain('WHERE "firstName" IS NOT NULL AND "age" IS NOT NULL AND "city" IS NOT NULL')
    })

    it ('Can query recommended shorthands as expressions', () => {
        const search = {            
            firstName: 'John',
            age: 27,
            city: 'Austin'
        }

        expect(str($.from(Contact).where({ equals: search })))
            .toContain('WHERE "firstName" = $firstName AND "age" = $age AND "city" = $city')
        expect(str($.from(Contact).where({ notEquals: search })))
            .toContain('WHERE "firstName" <> $firstName AND "age" <> $age AND "city" <> $city')
        expect(str($.from(Contact).where({ like: { firstName:'John', city:'Austin' } })))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(str($.from(Contact).where({ notLike: { firstName:'John', city:'Austin' } })))
            .toContain('WHERE "firstName" NOT LIKE $firstName AND "city" NOT LIKE $city')
        
        var { sql, params } = $.from(Contact).where({ startsWith: { firstName:'J', city:'A' } }).build()
        expect(str(sql))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(params)
            .toEqual({ firstName:'J%', city:'A%' })
        
        var { sql, params } = $.from(Contact).where({ endsWith: { firstName:'n', city:'n' } }).build()
        expect(str(sql))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(params)
            .toEqual({ firstName:'%n', city:'%n' })
        
        var { sql, params } = $.from(Contact).where({ contains: { firstName:'oh', city:'usti' } }).build()
        expect(str(sql))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(params)
            .toEqual({ firstName:'%oh%', city:'%usti%' })

        expect(str($.from(Contact).where({ in: { id:[10,20,30] } })))
            .toContain('WHERE "id" IN ($1,$2,$3)')

        expect(str($.from(Contact).where({ notIn: { id:[10,20,30] } })))
            .toContain('WHERE "id" NOT IN ($1,$2,$3)')

        expect(str($.from(Contact).where({ isNull: Object.keys(search) })))
            .toContain('WHERE "firstName" IS NULL AND "age" IS NULL AND "city" IS NULL')

        expect(str($.from(Contact).where({ notNull: Object.keys(search) })))
            .toContain('WHERE "firstName" IS NOT NULL AND "age" IS NOT NULL AND "city" IS NOT NULL')
    })

    it ('Can query OR shorthands', () => {
        const search = {            
            firstName: 'John',
            age: 27,
            city: 'Austin'
        }

        expect(str($.from(Contact).or({ equals: search })))
            .toContain('WHERE "firstName" = $firstName OR "age" = $age OR "city" = $city')
        expect(str($.from(Contact).or({ notEquals: search })))
            .toContain('WHERE "firstName" <> $firstName OR "age" <> $age OR "city" <> $city')
        expect(str($.from(Contact).or({ like: { firstName:'John', city:'Austin' } })))
            .toContain('WHERE "firstName" LIKE $firstName OR "city" LIKE $city')
        expect(str($.from(Contact).or({ notLike: { firstName:'John', city:'Austin' } })))
            .toContain('WHERE "firstName" NOT LIKE $firstName OR "city" NOT LIKE $city')
    })

    it ('Can query combination shorthands', () => {
        const search = {            
            firstName: 'John',
            age: 27,
            city: 'Austin'
        }
        const props = Object.keys(search)

        const { firstName, age, city } = search

        expect(str($.from(Contact).where({ equals: { firstName }, notEquals: { age, city } })))
            .toContain('WHERE "firstName" = $firstName AND "age" <> $age AND "city" <> $city')

        expect(str($.from(Contact).where({ isNull: props.slice(0,1), notNull: props.slice(1) })))
            .toContain('WHERE "firstName" IS NULL AND "age" IS NOT NULL AND "city" IS NOT NULL')
    })

    it (`Can query single Contact`, () => {
        const id = 1
        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(sql.replaceAll('\n','')).toBe(`SELECT ${selectContact}  FROM "Contact" WHERE "id" = $id`)
            expect(params.id).toBe(id)
        }

        expect(str($.from(Contact).where(c => $`${c.id} = ${id}`)))
            .toContain(`FROM "Contact" WHERE "id" = $1`)
            
        assert($.from(Contact).where({ equals: { id } }))
        assert($.from(Contact).where({ op:  ['=',{ id }] }))
        assert($.from(Contact).where({ sql: $('"id" = $id', { id }) }))
        assert($.from(Contact).where({ sql: { sql:'"id" = $id', params:{ id } } }))
    })

    it (`Can query single Person alias`, () => {
        const key = 1
        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectPerson} FROM "Contact" WHERE "id" = $key`)
            expect(params.key).toBe(key)
        }

        expect(str($.from(Person).where(c => $`${c.key} = ${key}`)))
            .toContain(`FROM "Contact" WHERE "id" = $1`)

        assert($.from(Person).where({ equals:  { key } }))
        assert($.from(Person).where({ op:  ['=',{ key }] }))
        assert($.from(Person).where({ sql: $('"id" = $key', { key }) }))
        assert($.from(Person).where({ sql: { sql:'"id" = $key', params:{ key } } }))

        expect(str($.from(Person).where((p:Person) => $`${p.key} = ${key}`)))
            .toBe(`SELECT ${selectPerson} FROM "Contact" WHERE "id" = $1`)
        // const p = sql.ref(Person,'p')
        // $.from(Person).where`${p.key} = ${key}`
    })

    it (`Can query single DynamicPerson alias`, () => {
        const key = 1
        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectPerson} FROM "Contact" WHERE "id" = $key`)
            expect(params.key).toBe(key)
        }

        expect(str($.from(DynamicPerson).where(c => $`${c.key} = ${key}`)))
            .toContain(`FROM "Contact" WHERE "id" = $1`)

        assert($.from(DynamicPerson).where({ equals:  { key } }))
        assert($.from(DynamicPerson).where({ op:  ['=',{ key }] }))
        assert($.from(DynamicPerson).where({ sql: $('"id" = $key', { key }) }))
        assert($.from(DynamicPerson).where({ sql: { sql:'"id" = $key', params:{ key } } }))
    })

    it (`Can query single Contact with multiple params`, () => {
        const id = 1
        const city = 'Austin'

        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectContact} FROM "Contact" WHERE "id" = $id AND "city" = $city`)
            expect(params.id).toBe(id)
        }

        expect(str($.from(Contact).where(c => $`${c.id} = ${id} AND ${c.city} = ${city}`)))
            .toContain(`FROM "Contact" WHERE "id" = $1 AND "city" = $2`)

        assert($.from(Contact).where({ equals: { id, city } }))
        assert($.from(Contact).where({ op:  ['=',{ id, city }] }))
        assert($.from(Contact).where({ sql: $('"id" = $id AND "city" = $city', { id, city }) }))
        assert($.from(Contact).where({ sql: [ $('"id" = $id', { id }), $('"city" = $city', { city }) ] }))

        assert($.from(Contact).where({ sql: $('"id" = $id AND "city" = $city', { id, city }) }))
    })

    it (`Can query single Person alias with multiple params`, () => {
        const key = 1
        const name = 'John'

        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectPerson} FROM "Contact" WHERE "id" = $key AND "firstName" = $name`)
            expect(params.key).toBe(key)
        }

        expect(str($.from(Person).where(c => $`${c.key} = ${key} AND ${c.name} = ${name}`)))
            .toContain(`FROM "Contact" WHERE "id" = $1 AND "firstName" = $2`)

        assert($.from(Person).where({ equals: { key, name } }))
        assert($.from(Person).where({ op:  ['=',{ key, name }] }))
        assert($.from(Person).where({ sql: $('"id" = $key AND "firstName" = $name', { key, name }) }))
        assert($.from(Person).where({ sql: [ $('"id" = $key', { key }), $('"firstName" = $name', { name }) ] }))
        assert($.from(Person).where({ sql: $('"id" = $key AND "firstName" = $name', { key, name }) }))
    })

    it (`Can query single Contact with tagged template`, () => {
        const id = 1
        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(sql).toBe(`SELECT ${selectContact}\n  FROM "Contact"\n WHERE "id" = $1`)
            expect(params['1']).toBe(id)
        }

        assert($.from(Contact).where(c => $`${c.id} = ${id}`))
        assert($.from(Contact).where`"id" = ${id}`)
        assert($.from(Contact).where({ sql: $`"id" = ${id}` }))
    })

})
