import { describe, it, expect } from 'bun:test'
import { $, db } from './db'
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
        const sorted = {
            ids: [1,2,3,4,5],
            emails: ["alice@mail.org","bob@mail.org","jane@mail.org","joe@doe.org","john@mail.org"],
            names: ['Alice','Bob','Jane Doe','Jo','John Doe']
        }

        db.dropTable(Contact)
        db.createTable(Contact)
        db.insertAll([
            new Contact({ name:"John Doe", email:"john@mail.org" }),
            new Contact({ name:"Jane Doe", email:"jane@mail.org" }),
        ])
        
        const janeEmail = 'jane@mail.org'
        const jane = db.one<Contact>($.from(Contact).where(c => $`${c.email} = ${janeEmail}`))!

        // Insert examples
        const { lastInsertRowid:bobId } = db.insert(new Contact({ name:"Bob", email:"bob@mail.org" }))
        expect(bobId).toBe(3)
        // useFilterSync(db, sql => console.log(sql))
        const { lastInsertRowid } = db.exec`INSERT INTO Contact(name,email) VALUES ('Jo','joe@doe.org')`
        expect(lastInsertRowid).toBe(4)
        const name = 'Alice', email = 'alice@mail.org'
        db.exec`INSERT INTO Contact(name,email) VALUES (${name}, ${email})`
        const alice = db.one`SELECT name,email from Contact WHERE email = ${email}`! as Contact
        expect(pick(alice, ['name','email'])).toEqual({ name, email })

        // Typed SQL fragment example
        const hasId = <Table extends { id:number }>(id:number|bigint) =>
            (x:Table) => $.sql($`${x.id} = $id`, { id })

        const bob = db.one($.from(Contact).where(hasId(bobId)).into(Contact)) // => Contact    
        expect(pick(bob!, ['name','email'])).toEqual({ name:"Bob", email:"bob@mail.org" })
        const contacts = db.all($.from(Contact).into(Contact))                // => Contact[]
        expect(contacts.length).toBe(sorted.ids.length)
        const contactsCount = db.value($.from(Contact).select`COUNT(*)`)      // => number
        expect(contactsCount).toBe(sorted.ids.length)
        expect(db.value($.from(Contact).rowCount())).toEqual(contactsCount)
        const emails = db.column($.from(Contact).select(c => $`${c.email}`))  // => string[]
        expect(emails.toSorted()).toEqual(sorted.emails)
        const dbContactsArray = db.arrays($.from(Contact))                    // => any[][]
        expect(dbContactsArray.length).toBe(sorted.ids.length)
        expect(dbContactsArray.map(x => x[0]).toSorted()).toEqual(sorted.ids)
        expect(dbContactsArray.map(x => x[1]).toSorted()).toEqual(sorted.names)
        expect(dbContactsArray.map(x => x[2]).toSorted()).toEqual(sorted.emails)
        const bobArray = db.array($.from(Contact).where(hasId(bobId)))        // => any[]
        expect(bobArray).toEqual([3,"Bob","bob@mail.org", bobArray![3]])

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
