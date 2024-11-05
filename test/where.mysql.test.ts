import { describe, it, expect } from 'bun:test'
import type { SqlBuilder } from '../src'
import { mysql as $ } from '../src'
import { Contact, DynamicPerson, Person } from './data'
import { str } from './utils'

const f = (name:string) => '`' + name + '`'
const Q = (name:string) => Symbol(name)
const [ qId, qFirstName, qAge, qCity, qContact ] = [ f('id'), f('firstName'), f('age'), f('city'), f('Contact') ]
const [ sId ] = [ Q(qId) ]

export const selectContact = 'id,firstName,lastName,age,email,phone,address,city,state,postCode,createdAt,updatedAt'
    .split(',').map(c => f(c)).join(', ')

export const selectPerson = 'id,firstName,lastName,email'
    .split(',').map(c => f(c)).join(', ')

describe('MySql WHERE Tests', () => {

    it ('Can query recommended shorthands', () => {
        const search = {            
            firstName: 'John',
            age: 27,
            city: 'Austin'
        }
        expect(str($.from(Contact).where({ equals: search })))
            .toContain(`WHERE ${qFirstName} = $firstName AND ${qAge} = $age AND ${qCity} = $city`)
        expect(str($.from(Contact).where({ notEquals: search })))
            .toContain(`WHERE ${qFirstName} <> $firstName AND ${qAge} <> $age AND ${qCity} <> $city`)
        expect(str($.from(Contact).where({ like: { firstName:'John', city:'Austin' } })))
            .toContain(`WHERE ${qFirstName} LIKE $firstName AND ${qCity} LIKE $city`)
        expect(str($.from(Contact).where({ notLike: { firstName:'John', city:'Austin' } })))
            .toContain(`WHERE ${qFirstName} NOT LIKE $firstName AND ${qCity} NOT LIKE $city`)
        
        var { sql, params } = $.from(Contact).where({ startsWith: { firstName:'J', city:'A' } }).build()
        expect(str(sql))
            .toContain(`WHERE ${qFirstName} LIKE $firstName AND ${qCity} LIKE $city`)
        expect(params)
            .toEqual({ firstName:'J%', city:'A%' })
        
        var { sql, params } = $.from(Contact).where({ endsWith: { firstName:'n', city:'n' } }).build()
        expect(str(sql))
            .toContain(`WHERE ${qFirstName} LIKE $firstName AND ${qCity} LIKE $city`)
        expect(params)
            .toEqual({ firstName:'%n', city:'%n' })
        
        var { sql, params } = $.from(Contact).where({ contains: { firstName:'oh', city:'usti' } }).build()
        expect(str(sql))
            .toContain(`WHERE ${qFirstName} LIKE $firstName AND ${qCity} LIKE $city`)
        expect(params)
            .toEqual({ firstName:'%oh%', city:'%usti%' })

        expect(str($.from(Contact).where({ in: { id:[10,20,30] } })))
            .toContain(`WHERE ${qId} IN ($_1,$_2,$_3)`)

        expect(str($.from(Contact).where({ notIn: { id:[10,20,30] } })))
            .toContain(`WHERE ${qId} NOT IN ($_1,$_2,$_3)`)

        expect(str($.from(Contact).where({ isNull: Object.keys(search) })))
            .toContain(`WHERE ${qFirstName} IS NULL AND ${qAge} IS NULL AND ${qCity} IS NULL`)

        expect(str($.from(Contact).where({ notNull: Object.keys(search) })))
            .toContain(`WHERE ${qFirstName} IS NOT NULL AND ${qAge} IS NOT NULL AND ${qCity} IS NOT NULL`)
    })

    it ('Can query recommended shorthands as expressions', () => {
        const search = {            
            firstName: 'John',
            age: 27,
            city: 'Austin'
        }

        expect(str($.from(Contact).where({ equals: search })))
            .toContain(`WHERE ${qFirstName} = $firstName AND ${qAge} = $age AND ${qCity} = $city`)
        expect(str($.from(Contact).where({ notEquals: search })))
            .toContain(`WHERE ${qFirstName} <> $firstName AND ${qAge} <> $age AND ${qCity} <> $city`)
        expect(str($.from(Contact).where({ like: { firstName:'John', city:'Austin' } })))
            .toContain(`WHERE ${qFirstName} LIKE $firstName AND ${qCity} LIKE $city`)
        expect(str($.from(Contact).where({ notLike: { firstName:'John', city:'Austin' } })))
            .toContain(`WHERE ${qFirstName} NOT LIKE $firstName AND ${qCity} NOT LIKE $city`)
        
        var { sql, params } = $.from(Contact).where({ startsWith: { firstName:'J', city:'A' } }).build()
        expect(str(sql))
            .toContain(`WHERE ${qFirstName} LIKE $firstName AND ${qCity} LIKE $city`)
        expect(params)
            .toEqual({ firstName:'J%', city:'A%' })
        
        var { sql, params } = $.from(Contact).where({ endsWith: { firstName:'n', city:'n' } }).build()
        expect(str(sql))
            .toContain(`WHERE ${qFirstName} LIKE $firstName AND ${qCity} LIKE $city`)
        expect(params)
            .toEqual({ firstName:'%n', city:'%n' })
        
        var { sql, params } = $.from(Contact).where({ contains: { firstName:'oh', city:'usti' } }).build()
        expect(str(sql))
            .toContain(`WHERE ${qFirstName} LIKE $firstName AND ${qCity} LIKE $city`)
        expect(params)
            .toEqual({ firstName:'%oh%', city:'%usti%' })

        expect(str($.from(Contact).where({ in: { id:[10,20,30] } })))
            .toContain(`WHERE ${qId} IN ($_1,$_2,$_3)`)

        expect(str($.from(Contact).where({ notIn: { id:[10,20,30] } })))
            .toContain(`WHERE ${qId} NOT IN ($_1,$_2,$_3)`)

        expect(str($.from(Contact).where({ isNull: Object.keys(search) })))
            .toContain(`WHERE ${qFirstName} IS NULL AND ${qAge} IS NULL AND ${qCity} IS NULL`)

        expect(str($.from(Contact).where({ notNull: Object.keys(search) })))
            .toContain(`WHERE ${qFirstName} IS NOT NULL AND ${qAge} IS NOT NULL AND ${qCity} IS NOT NULL`)
    })

    it ('Can query OR shorthands', () => {
        const search = {            
            firstName: 'John',
            age: 27,
            city: 'Austin'
        }

        expect(str($.from(Contact).or({ equals: search })))
            .toContain(`WHERE ${qFirstName} = $firstName OR ${qAge} = $age OR ${qCity} = $city`)
        expect(str($.from(Contact).or({ notEquals: search })))
            .toContain(`WHERE ${qFirstName} <> $firstName OR ${qAge} <> $age OR ${qCity} <> $city`)
        expect(str($.from(Contact).or({ like: { firstName:'John', city:'Austin' } })))
            .toContain(`WHERE ${qFirstName} LIKE $firstName OR ${qCity} LIKE $city`)
        expect(str($.from(Contact).or({ notLike: { firstName:'John', city:'Austin' } })))
            .toContain(`WHERE ${qFirstName} NOT LIKE $firstName OR ${qCity} NOT LIKE $city`)
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
            .toContain(`WHERE ${qFirstName} = $firstName AND ${qAge} <> $age AND ${qCity} <> $city`)

        expect(str($.from(Contact).where({ isNull: props.slice(0,1), notNull: props.slice(1) })))
            .toContain(`WHERE ${qFirstName} IS NULL AND ${qAge} IS NOT NULL AND ${qCity} IS NOT NULL`)
    })

    it (`Can query single Contact`, () => {
        const id = 1
        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectContact} FROM ${qContact} WHERE ${qId} = $id`)
            expect(params.id).toBe(id)
        }

        expect(str($.from(Contact).where(c => $`${c.id} = ${id}`)))
        .toContain(`FROM ${qContact} WHERE ${qId} = $_1`)
            
        assert($.from(Contact).where({ equals: { id } }))
        assert($.from(Contact).where({ op:  ['=',{ id }] }))
        assert($.from(Contact).where({ sql: $(`${qId} = $id`, { id }) }))
        assert($.from(Contact).where({ sql: { sql:`${qId} = $id`, params:{ id } } }))
    })

    it (`Can query single Person alias`, () => {
        const key = 1
        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectPerson} FROM ${qContact} WHERE ${qId} = $key`)
            expect(params.key).toBe(key)
        }

        expect(str($.from(Person).where(c => $`${c.key} = ${key}`)))
            .toContain(`FROM ${qContact} WHERE ${qId} = $_1`)

        assert($.from(Person).where({ equals:  { key } }))
        assert($.from(Person).where({ op:  ['=',{ key }] }))
        assert($.from(Person).where({ sql: $(`${qId} = $key`, { key }) }))
        assert($.from(Person).where({ sql: { sql:`${qId} = $key`, params:{ key } } }))

        expect(str($.from(Person).where((p:Person) => $`${p.key} = ${key}`)))
            .toBe(`SELECT ${selectPerson} FROM ${qContact} WHERE ${qId} = $_1`)
        // const p = sql.ref(Person,'p')
        // $.from(Person).where`${p.key} = ${key}`
    })

    it (`Can query single DynamicPerson alias`, () => {
        const key = 1
        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectPerson} FROM ${qContact} WHERE ${qId} = $key`)
            expect(params.key).toBe(key)
        }

        expect(str($.from(DynamicPerson).where(c => $`${c.key} = ${key}`)))
            .toContain(`FROM ${qContact} WHERE ${qId} = $_1`)

        assert($.from(DynamicPerson).where({ equals:  { key } }))
        assert($.from(DynamicPerson).where({ op:  ['=',{ key }] }))
        assert($.from(DynamicPerson).where({ sql: $(`${qId} = $key`, { key }) }))
        assert($.from(DynamicPerson).where({ sql: { sql:`${qId} = $key`, params:{ key } } }))
    })

    it (`Can query single Contact with multiple params`, () => {
        const id = 1
        const city = 'Austin'

        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectContact} FROM ${qContact} WHERE ${qId} = $id AND ${qCity} = $city`)
            expect(params.id).toBe(id)
        }

        expect(str($.from(Contact).where(c => $`${c.id} = ${id} AND ${c.city} = ${city}`)))
            .toContain(`FROM ${qContact} WHERE ${qId} = $_1 AND ${qCity} = $_2`)

        assert($.from(Contact).where({ equals: { id, city } }))
        assert($.from(Contact).where({ op:  ['=',{ id, city }] }))
        assert($.from(Contact).where({ sql: $(`${qId} = $id AND ${qCity} = $city`, { id, city }) }))

        assert($.from(Contact).where({ sql: $(`${qId} = $id AND ${qCity} = $city`, { id, city }) }))
    })

    it (`Can query single Person alias with multiple params`, () => {
        const key = 1
        const name = 'John'

        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectPerson} FROM ${qContact} WHERE ${qId} = $key AND ${qFirstName} = $name`)
            expect(params.key).toBe(key)
        }

        expect(str($.from(Person).where(c => $`${c.key} = ${key} AND ${c.name} = ${name}`)))
            .toContain(`FROM ${qContact} WHERE ${qId} = $_1 AND ${qFirstName} = $_2`)

        assert($.from(Person).where({ equals: { key, name } }))
        assert($.from(Person).where({ op:  ['=',{ key, name }] }))
        assert($.from(Person).where({ sql: $(`${qId} = $key AND ${qFirstName} = $name`, { key, name }) }))
        assert($.from(Person).where({ sql: $(`${qId} = $key AND ${qFirstName} = $name`, { key, name }) }))
    })

    it (`Can query single Contact with tagged template`, () => {
        const id = 1
        function assert(q:SqlBuilder) {
            const { sql, params } = q.build()
            expect(str(sql)).toBe(`SELECT ${selectContact} FROM ${qContact} WHERE ${qId} = $_1`)
            expect(params._1).toBe(id)
        }

        assert($.from(Contact).where(c => $`${c.id} = ${id}`))
        assert($.from(Contact).where`${sId} = ${id}`)
        assert($.from(Contact).where({ sql: $`${sId} = ${id}` }))
    })

})
