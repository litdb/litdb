import { describe, it, expect } from 'bun:test'
import { sync as db, $ } from './db'
import { table, column, pick } from '../src'

@table() class Contact {
    constructor(data?: Partial<Contact>) { Object.assign(this, data) }
    @column("INTEGER",  { autoIncrement:true }) id = 0
    @column("TEXT",     { required:true }) name = ''
    @column("TEXT",     { required:true, index:true, unique:true }) email = ''
    @column("DATETIME", { defaultValue:"CURRENT_TIMESTAMP" }) createdAt = new Date()
}

describe('SQLite Driver Example Tests', () => {

    it ('Can run litdb.dev example', () => {

        db.dropTable(Contact)
        db.createTable(Contact)
        db.insertAll([
            new Contact({ name:"John Doe", email:"john@email.org" }),
            new Contact({ name:"Jane Doe", email:"jane@email.org" }),
        ])
        
        const janeEmail = 'jane@email.org'
        const jane = db.one<Contact>($.from(Contact).where(c => $`${c.email} = ${janeEmail}`))!

        // Insert examples
        const { lastInsertRowid:bobId } = db.insert(new Contact({ name:"Bob", email:"bob@email.org" }))
        expect(bobId).toBe(3)
        const { lastInsertRowid } = db.exec`INSERT INTO Contact(name,email) VALUES ('Joe','joe@doe.org')`
        expect(lastInsertRowid).toBe(4)
        const name = 'Alice', email = 'alice@email.org'
        db.exec`INSERT INTO Contact(name,email) VALUES (${name}, ${email})`
        const alice = db.one`SELECT name,email from Contact WHERE email = ${email}`! as Contact
        expect(pick(alice, ['name','email'])).toEqual({ name, email })

        // Typed SQL fragment example
        const hasId = <Table extends { id:number }>(id:number|bigint) =>
            (x:Table) => $.fragment($`${x.id} = $id`, { id })

        const bob = db.one($.from(Contact).where(hasId(bobId)).into(Contact)) // => Contact    
        expect(pick(bob!, ['name','email'])).toEqual({ name:"Bob", email:"bob@email.org" })
        const contacts = db.all($.from(Contact).into(Contact))                // => Contact[]
        expect(contacts.length).toBe(2 + 1 + 1 + 1)
        const contactsCount = db.value($.from(Contact).select`COUNT(*)`)      // => number
        expect(contactsCount).toBe(2 + 1 + 1 + 1)
        const emails = db.column($.from(Contact).select(c => $`${c.email}`))  // => string[]
        expect(emails.toSorted()).toEqual([
            "alice@email.org",
            "bob@email.org",
            "jane@email.org",
            "joe@doe.org",
            "john@email.org",
        ])
        const dbContactsArray = db.arrays($.from(Contact))                    // => any[][]
        expect(dbContactsArray.length).toBe(2 + 1 + 1 + 1)
        const bobArray = db.array($.from(Contact).where(hasId(bobId)))        // => any[]
        expect(bobArray).toEqual([3,"Bob","bob@email.org", bobArray![3]])

        // Update examples
        jane.email = 'jane@doe.org'
        db.update(jane)                           // Update all properties
        expect(db.value($.from(Contact).select`email`.where`id = ${jane.id}`)).toEqual(jane.email)
        
        jane.email = 'jane2@doe.org'
        db.update(jane, { onlyProps:['email'] })  // Update only email
        expect(db.value($.from(Contact).select`email`.where`id = ${jane.id}`)).toEqual(jane.email)
        
        jane.email = 'jane3@doe.org'
        db.exec($.update(Contact).set({ email:jane.email }).where(hasId(jane.id))) // query builder
        expect(db.value($.from(Contact).select`email`.where`id = ${jane.id}`)).toEqual(jane.email)

        // Delete examples
        db.delete(jane)
        db.exec($.deleteFrom(Contact).where(hasId(jane.id))) // query builder

        const noJane = db.one<Contact>($.from(Contact).where(c => $`${c.email} = ${janeEmail}`))
        expect(noJane).toBe(null)
    })
})
