import { describe, it, expect } from 'bun:test'
import type { SqlBuilder } from '../src/types'
import { Contact, DynamicPerson, Person } from './data'
import { selectContact, selectPerson, str } from './utils'
import { sync as db, $ } from './db'

describe('SQLite WHERE Tests', () => {

    it ('Can query recommended shorthands', () => {
        const search = {            
            firstName: 'John',
            age: 27,
            city: 'Austin'
        }

        expect(str(db.from(Contact).where({ equals: search })))
            .toContain('WHERE "firstName" = $firstName AND "age" = $age AND "city" = $city')
        expect(str(db.from(Contact).where({ notEquals: search })))
            .toContain('WHERE "firstName" <> $firstName AND "age" <> $age AND "city" <> $city')
        expect(str(db.from(Contact).where({ like: { firstName:'John', city:'Austin' } })))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(str(db.from(Contact).where({ notLike: { firstName:'John', city:'Austin' } })))
            .toContain('WHERE "firstName" NOT LIKE $firstName AND "city" NOT LIKE $city')
        
        var { sql, params } = db.from(Contact).where({ startsWith: { firstName:'J', city:'A' } }).build()
        expect(str(sql))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(params)
            .toEqual({ firstName:'J%', city:'A%' })
        
        var { sql, params } = db.from(Contact).where({ endsWith: { firstName:'n', city:'n' } }).build()
        expect(str(sql))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(params)
            .toEqual({ firstName:'%n', city:'%n' })
        
        var { sql, params } = db.from(Contact).where({ contains: { firstName:'oh', city:'usti' } }).build()
        expect(str(sql))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(params)
            .toEqual({ firstName:'%oh%', city:'%usti%' })

        expect(str(db.from(Contact).where({ in: { id:[10,20,30] } })))
            .toContain('WHERE "id" IN ($1,$2,$3)')

        expect(str(db.from(Contact).where({ notIn: { id:[10,20,30] } })))
            .toContain('WHERE "id" NOT IN ($1,$2,$3)')

        expect(str(db.from(Contact).where({ isNull: Object.keys(search) })))
            .toContain('WHERE "firstName" IS NULL AND "age" IS NULL AND "city" IS NULL')

        expect(str(db.from(Contact).where({ notNull: Object.keys(search) })))
            .toContain('WHERE "firstName" IS NOT NULL AND "age" IS NOT NULL AND "city" IS NOT NULL')
    })

    it ('Can query recommended shorthands as expressions', () => {
        const search = {            
            firstName: 'John',
            age: 27,
            city: 'Austin'
        }

        expect(str(db.from(Contact).where({ equals: search })))
            .toContain('WHERE "firstName" = $firstName AND "age" = $age AND "city" = $city')
        expect(str(db.from(Contact).where({ notEquals: search })))
            .toContain('WHERE "firstName" <> $firstName AND "age" <> $age AND "city" <> $city')
        expect(str(db.from(Contact).where({ like: { firstName:'John', city:'Austin' } })))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(str(db.from(Contact).where({ notLike: { firstName:'John', city:'Austin' } })))
            .toContain('WHERE "firstName" NOT LIKE $firstName AND "city" NOT LIKE $city')
        
        var { sql, params } = db.from(Contact).where({ startsWith: { firstName:'J', city:'A' } }).build()
        expect(str(sql))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(params)
            .toEqual({ firstName:'J%', city:'A%' })
        
        var { sql, params } = db.from(Contact).where({ endsWith: { firstName:'n', city:'n' } }).build()
        expect(str(sql))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(params)
            .toEqual({ firstName:'%n', city:'%n' })
        
        var { sql, params } = db.from(Contact).where({ contains: { firstName:'oh', city:'usti' } }).build()
        expect(str(sql))
            .toContain('WHERE "firstName" LIKE $firstName AND "city" LIKE $city')
        expect(params)
            .toEqual({ firstName:'%oh%', city:'%usti%' })

        expect(str(db.from(Contact).where({ in: { id:[10,20,30] } })))
            .toContain('WHERE "id" IN ($1,$2,$3)')

        expect(str(db.from(Contact).where({ notIn: { id:[10,20,30] } })))
            .toContain('WHERE "id" NOT IN ($1,$2,$3)')

        expect(str(db.from(Contact).where({ isNull: Object.keys(search) })))
            .toContain('WHERE "firstName" IS NULL AND "age" IS NULL AND "city" IS NULL')

        expect(str(db.from(Contact).where({ notNull: Object.keys(search) })))
            .toContain('WHERE "firstName" IS NOT NULL AND "age" IS NOT NULL AND "city" IS NOT NULL')
    })

    it ('Can query OR shorthands', () => {
        const search = {            
            firstName: 'John',
            age: 27,
            city: 'Austin'
        }

        expect(str(db.from(Contact).or({ equals: search })))
            .toContain('WHERE "firstName" = $firstName OR "age" = $age OR "city" = $city')
        expect(str(db.from(Contact).or({ notEquals: search })))
            .toContain('WHERE "firstName" <> $firstName OR "age" <> $age OR "city" <> $city')
        expect(str(db.from(Contact).or({ like: { firstName:'John', city:'Austin' } })))
            .toContain('WHERE "firstName" LIKE $firstName OR "city" LIKE $city')
        expect(str(db.from(Contact).or({ notLike: { firstName:'John', city:'Austin' } })))
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

        expect(str(db.from(Contact).where({ equals: { firstName }, notEquals: { age, city } })))
            .toContain('WHERE "firstName" = $firstName AND "age" <> $age AND "city" <> $city')

        expect(str(db.from(Contact).where({ isNull: props.slice(0,1), notNull: props.slice(1) })))
            .toContain('WHERE "firstName" IS NULL AND "age" IS NOT NULL AND "city" IS NOT NULL')
    })

    it (`Can query single Contact`, () => {
        const id = 1
        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(sql.replaceAll('\n','')).toBe(`SELECT ${selectContact}  FROM "Contact" WHERE "id" = $id`)
            expect(params.id).toBe(id)
        }

        expect(str(db.from(Contact).where(c => $`${c.id} = ${id}`)))
            .toContain(`FROM "Contact" WHERE "id" = $1`)
            
        assert(db.from(Contact).where({ equals: { id } }))
        assert(db.from(Contact).where({ op:  ['=',{ id }] }))
        assert(db.from(Contact).where({ sql: db.$('"id" = $id', { id }) }))
        assert(db.from(Contact).where({ sql: $('"id" = $id', { id }) }))
        assert(db.from(Contact).where({ sql: { sql:'"id" = $id', params:{ id } } }))
    })

    it (`Can query single Person alias`, () => {
        const key = 1
        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectPerson} FROM "Contact" WHERE "id" = $key`)
            expect(params.key).toBe(key)
        }

        expect(str(db.from(Person).where(c => $`${c.key} = ${key}`)))
            .toContain(`FROM "Contact" WHERE "id" = $1`)

        assert(db.from(Person).where({ equals:  { key } }))
        assert(db.from(Person).where({ op:  ['=',{ key }] }))
        assert(db.from(Person).where({ sql: db.$('"id" = $key', { key }) }))
        assert(db.from(Person).where({ sql: $('"id" = $key', { key }) }))
        assert(db.from(Person).where({ sql: { sql:'"id" = $key', params:{ key } } }))

        expect(str(db.from(Person).where((p:Person) => $`${p.key} = ${key}`)))
            .toBe(`SELECT ${selectPerson} FROM "Contact" WHERE "id" = $1`)
        // const p = sql.ref(Person,'p')
        // db.from(Person).where`${p.key} = ${key}`
    })

    it (`Can query single DynamicPerson alias`, () => {
        const key = 1
        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(sql.replaceAll('\n','')).toBe(`SELECT ${selectPerson}  FROM "Contact" WHERE "id" = $key`)
            expect(params.key).toBe(key)
        }

        expect(str(db.from(DynamicPerson).where(c => $`${c.key} = ${key}`)))
            .toContain(`FROM "Contact" WHERE "id" = $1`)

        assert(db.from(DynamicPerson).where({ equals:  { key } }))
        assert(db.from(DynamicPerson).where({ op:  ['=',{ key }] }))
        assert(db.from(DynamicPerson).where({ sql: db.$('"id" = $key', { key }) }))
        assert(db.from(DynamicPerson).where({ sql: $('"id" = $key', { key }) }))
        assert(db.from(DynamicPerson).where({ sql: { sql:'"id" = $key', params:{ key } } }))
    })

    it (`Can query single Contact with multiple params`, () => {
        const id = 1
        const city = 'Austin'

        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectContact} FROM "Contact" WHERE "id" = $id AND "city" = $city`)
            expect(params.id).toBe(id)
        }

        expect(str(db.from(Contact).where(c => $`${c.id} = ${id} AND ${c.city} = ${city}`)))
            .toContain(`FROM "Contact" WHERE "id" = $1 AND "city" = $2`)

        assert(db.from(Contact).where({ equals: { id, city } }))
        assert(db.from(Contact).where({ op:  ['=',{ id, city }] }))
        assert(db.from(Contact).where({ sql: db.$('"id" = $id AND "city" = $city', { id, city }) }))
        assert(db.from(Contact).where({ sql: $('"id" = $id AND "city" = $city', { id, city }) }))
        assert(db.from(Contact).where({ sql: [ $('"id" = $id', { id }), $('"city" = $city', { city }) ] }))

        assert(db.from(Contact).where({ sql: $('"id" = $id AND "city" = $city', { id, city }) }))
    })

    it (`Can query single Person alias with multiple params`, () => {
        const key = 1
        const name = 'John'

        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectPerson} FROM "Contact" WHERE "id" = $key AND "firstName" = $name`)
            expect(params.key).toBe(key)
        }

        expect(str(db.from(Person).where(c => $`${c.key} = ${key} AND ${c.name} = ${name}`)))
            .toContain(`FROM "Contact" WHERE "id" = $1 AND "firstName" = $2`)

        assert(db.from(Person).where({ equals: { key, name } }))
        assert(db.from(Person).where({ op:  ['=',{ key, name }] }))
        assert(db.from(Person).where({ sql: db.$('"id" = $key AND "firstName" = $name', { key, name }) }))
        assert(db.from(Person).where({ sql: $('"id" = $key AND "firstName" = $name', { key, name }) }))
        assert(db.from(Person).where({ sql: [ $('"id" = $key', { key }), $('"firstName" = $name', { name }) ] }))
        assert(db.from(Person).where({ sql: $('"id" = $key AND "firstName" = $name', { key, name }) }))
    })

    it (`Can query single Contact with tagged template`, () => {
        const id = 1
        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(sql).toBe(`SELECT ${selectContact}\n  FROM "Contact"\n WHERE "id" = $1`)
            expect(params['1']).toBe(id)
        }

        assert(db.from(Contact).where(c => $`${c.id} = ${id}`))
        assert(db.from(Contact).where`"id" = ${id}`)
        assert(db.from(Contact).where({ sql: $`"id" = ${id}` }))
    })

})
