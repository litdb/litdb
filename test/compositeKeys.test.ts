import { describe, it, expect } from 'bun:test'
import { $, db } from './db'
import { table, column } from '../src'

@table()
export class Foo {
    constructor(data?: Partial<Foo>) { Object.assign(this, data) }

    @column("INTEGER", { primaryKey: true, required: true })
    fooKey = 0

    @column("INTEGER", { primaryKey: true, required: true })
    barKey = 0

    @column("TEXT", { required: true })
    misc = ''
}

describe.only('SQLite Driver Composite Keys Tests', () => {
  
    it ('Does support composite keys', () => {
        db.dropTable(Foo)
        db.createTable(Foo)

        db.insertAll([
            new Foo({ fooKey: 1, barKey: 1, misc: 'one' }),
            new Foo({ fooKey: 1, barKey: 2, misc: 'two' }),
        ])

        const isOne = (f:Foo) => $`${f.fooKey} = 1 AND ${f.barKey} = 1`
        const isTwo = (f:Foo) => $`${f.fooKey} = 1 AND ${f.barKey} = 2`

        const qOne = $.from(Foo).where(isOne)
        const qTwo = $.from(Foo).where(isTwo)

        const rowOne = db.one<Foo>(qOne)!
        expect(rowOne.misc).toBe('one')
        let rowTwo = db.one<Foo>(qTwo)!
        expect(rowTwo.misc).toBe('two')

        db.update(new Foo({ fooKey: 1, barKey: 1, misc: 'ONE' }))
        const updatedOne = db.one<Foo>(qOne)!
        expect(updatedOne.misc).toBe('ONE')

        rowTwo = db.one<Foo>(qTwo)!
        expect(rowTwo.misc).toBe('two')

        var { changes } = db.exec(
            $.update(Foo).set({ misc:'Two' }).where(isTwo))
        expect(changes).toBe(1)
        rowTwo = db.one<Foo>(qTwo)!
        expect(rowTwo.misc).toBe('Two')

        var { changes } = db.exec(
            $.update(Foo).set(f => $`${f.misc} = 'TWO'`).where(isTwo))
        expect(changes).toBe(1)
        rowTwo = db.one<Foo>(qTwo)!
        expect(rowTwo.misc).toBe('TWO')

        db.delete(rowTwo)
        expect(db.one<Foo>(qTwo)).toBeNull()

        expect(db.one<Foo>(qOne)).not.toBeNull()
    })

})