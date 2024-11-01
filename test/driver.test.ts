import { describe, it, expect, beforeAll } from 'bun:test'
import { contacts, Contact } from './data'
import { sync as db } from './db'

describe('SQLite Driver Tests', () => {

    beforeAll(() => {
        db.dropTable(Contact)
        db.createTable(Contact)
        db.insertAll(contacts)
    })

    it ('should be able to run a test', () => {
        let getContact = (id:number) => 
            db.single<Contact>`select firstName, lastName from Contact where id = ${id}`

        let contact = getContact(1)!
        console.log('contact', contact)
        expect(contact.firstName).toBe('John')
        expect(contact.lastName).toBe('Doe')

        contact = getContact(2)!
        expect(contact.firstName).toBe('Jane')
        expect(contact.lastName).toBe('Smith')
    })

})
