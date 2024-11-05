import { describe, it, expect, beforeAll } from 'bun:test'
import { contacts, Contact } from './data'
import { sync as db, $ } from './db'
import { FilterConnection, omit, pick, } from '../src'


describe('SQLite Driver Tests', () => {

    beforeAll(() => {
        db.dropTable(Contact)
        db.createTable(Contact)
        db.insertAll(contacts)
        const origRows = db.all($.from(Contact)) as Record<string,any>[]
        $.dump(omit(origRows, ['phone','createdAt','updatedAt']))
        $.dump(pick(origRows, ['id','firstName','lastName','age']))
    })

    it ('can use templated string', () => {
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

    it ('does CRUD Contact Table', () => {

        const sub = new FilterConnection(db, sql => console.log(sql))
        db.dropTable(Contact)

        expect(db.listTables()).not.toContain(Contact.name)

        db.createTable(Contact)

        expect(db.listTables()).toContain(Contact.name)

        db.insert(contacts[0])

        expect(db.value($.from(Contact).select`COUNT(*)`)).toBe(1)

        db.insertAll(contacts.slice(1))

        expect(db.value($.from(Contact).select`COUNT(*)`)).toBe(contacts.length)

        var updateContact = Object.assign(new Contact, contacts[0], { age:30 })
        db.update(updateContact, { onlyProps:['age'] })

        var dbContacts = db.all($.from(Contact).into(Contact))
        $.dump(pick(dbContacts, ['id','firstName','lastName','age']))

        const frag = $.from(Contact).where(c => $`${c.id} == ${updateContact.id}`).into(Contact)
        // console.log('frag', frag)
        const into = db.one(frag)!
        expect(into.age).toBe(30)
        // expect(into).toBeInstanceOf(Contact)

        sub.release()
    })

})
