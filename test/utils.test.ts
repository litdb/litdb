import { describe, it, expect } from 'bun:test'
import { column, mergeParams, table } from "../src"
import { sqlite as $ } from '../src'

const f = (name:string) => '"' + name + '"'
const [ qId, qFirstName ] = [ f('id'), f('firstName') ]
@table() class C {
    @column("INTEGER") id = 0
    @column("TEXT") firstName = ''
}

describe(`Utils tests`, () => {

    it (`mergeParams also merges multiple params`, () => {
        const ids = [10,20,30]
        const names = ['John','Jane','Bob']

        const c = $.ref(C,'')
        var { sql, params } = $`WHERE ${c.id} = ${ids[0]} AND ${c.firstName} = ${names[0]}`
        expect(sql).toBe(`WHERE ${qId} = $_1 AND ${qFirstName} = $_2`)
        expect(params).toEqual({
            _1: 10,
            _2: 'John'
        })

        sql += mergeParams(params, $` AND ${c.id} IN (${ids})`)
        expect(sql).toBe(`WHERE ${qId} = $_1 AND ${qFirstName} = $_2 AND ${qId} IN ($_3,$_4,$_5)`)
        expect(params).toEqual({
            _1: 10,
            _2: 'John',
            _3: 10,
            _4: 20,
            _5: 30,
        })

        sql += mergeParams(params, $` AND ${c.firstName} IN (${names})`)
        expect(sql).toEndWith(`WHERE ${qId} = $_1 AND ${qFirstName} = $_2 AND ${qId} IN ($_3,$_4,$_5) AND ${qFirstName} IN ($_6,$_7,$_8)`)
    })

})
