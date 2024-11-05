import { describe, it, expect } from 'bun:test'
import { contacts, Contact, Order } from './data'
import { sync as db, $ } from './db'
import { useFilter, omit, pick, } from '../src'

const recreateContacts = () => {
    db.dropTable(Contact)
    db.createTable(Contact)
    db.insertAll(contacts)
}

describe('SQLite Driver Tests', () => {

    it ('Can log contacts', () => {
        recreateContacts()
        const origRows = db.all($.from(Contact))
        $.dump(origRows)
        $.dump(omit(origRows, ['phone','createdAt','updatedAt']))
        $.dump(pick(origRows, ['id','firstName','lastName','age']))
    })

    it ('can use templated string', () => {
        recreateContacts()
        let getContact = (id:number) => 
            db.one<Contact>`select firstName, lastName from Contact where id = ${id}`

        let contact = getContact(1)!
        $.log(contact)
        expect(contact.firstName).toBe('John')
        expect(contact.lastName).toBe('Doe')

        contact = getContact(2)!
        expect(contact.firstName).toBe('Jane')
        expect(contact.lastName).toBe('Smith')
    })

    it ('does map into Class', () => {
        recreateContacts()

        // No select, selects all columns of Primary table which uses 'into' implicitly
        expect(db.one($.from(Contact).where(c => $`${c.id} == ${contacts[0].id}`))).toBeInstanceOf(Contact)
        
        db.dropTable(Order)
        db.createTable(Order)
        db.insert(new Order({ contactId:1 }))
        expect(db.one($.from(Contact).join(Order, { on:(c,o) => $`${c.id} = ${o.contactId}` }))).toBeInstanceOf(Contact)

        // Any select invalidates implicit into
        const q = $.from(Contact).where(c => $`${c.id} == ${contacts[0].id}`)
        expect(db.one(q.select('*'))).not.toBeInstanceOf(Contact)

        // Use into to return results into class
        expect(db.one(q.into(Contact))).toBeInstanceOf(Contact)

        const dbContacts = db.all($.from(Contact).into(Contact))
        for (const row of dbContacts) {
            expect(row).toBeInstanceOf(Contact)
        }
    })

    it ('does Filter prepareSync', () => {
        const sqls:string[] = []
        const sub = useFilter(db, sql => sqls.push(sql[0]))
        db.one`SELECT 1`
        db.one`SELECT 2`
        expect(sqls).toEqual(['SELECT 1', 'SELECT 2'])
        sub.release()
        db.one`SELECT 3`
        expect(sqls.length).toEqual(2)
    })

    it ('does CRUD Contact Table', () => {

        const sub = useFilter(db, sql => console.log(sql))
        db.dropTable(Contact)

        expect(db.listTables()).not.toContain(Contact.name)

        db.createTable(Contact)

        expect(db.listTables()).toContain(Contact.name)

        var { changes, lastInsertRowid } = db.insert(contacts[0])
        expect(changes).toBe(1)
        expect(lastInsertRowid).toBe(1)

        expect(db.value($.from(Contact).select`COUNT(*)`)).toBe(1)

        var { changes, lastInsertRowid } = db.insertAll(contacts.slice(1))
        expect(changes).toBe(4)
        expect(lastInsertRowid).toBe(5)

        expect(db.value($.from(Contact).select`COUNT(*)`)).toBe(contacts.length)

        var dbContacts = $.from(Contact).select({ props:['id','firstName','lastName','age'] }).into(Contact)
        $.dump(db.all(dbContacts))

        var updateContact = Object.assign(new Contact, contacts[0], { age:40 })
        var { changes } = db.update(updateContact, { onlyProps:['age'] })
        expect(changes).toBe(1)

        $.dump(db.all(dbContacts))

        const q = $.from(Contact).where(c => $`${c.id} == ${updateContact.id}`).into(Contact)
        // console.log('frag', frag)
        const one = db.one(q)!
        expect(one.age).toBe(40)

        db.delete(one)

        expect(db.one(q)).toBeNull()

        db.exec($.deleteFrom(Contact).where(c => $`${c.age} = 40`))
        const remaining = db.all(dbContacts)
        $.dump(remaining)

        expect(remaining).toBeArrayOfSize(3)
        for (const contact of remaining) {
            expect(contact.age).not.toEqual(40)
        }

        expect(db.value($.from(Contact).select`COUNT(*)`)).toBe(remaining.length)
        expect(db.value($.from(Contact).rowCount())).toBe(remaining.length)

        expect(db.value($.from(Contact).where(c => $`${c.age} = 40`).exists())).toBeFalse()

        expect(db.value($.from(Contact).exists())).toBeTrue()

        db.exec($.deleteFrom(Contact))

        expect(db.value($.from(Contact).exists())).toBeFalse()

        expect(db.value($.from(Contact).select`COUNT(*)`)).toBe(0)
        expect(db.value($.from(Contact).rowCount())).toBe(0)

        sub.release()
    })

})
