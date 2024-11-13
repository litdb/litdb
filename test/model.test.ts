import { describe, it, expect } from 'bun:test'
import type { ReflectMeta } from '../src'
import { Sqlite, Meta } from '../src'
import { Contact } from './data'

const schema = Sqlite.schema

describe ('SQLite Create Table Tests', () => {

    it ('does get Contact meta', () => {
        //console.log('Contact', Contact, Contact.name, Contact.constructor, Contact.constructor.name)
        const meta = Meta.assert(Contact)
        expect(meta).toBeDefined()
    })

    it ('does generate DROP Contact Table', () => {
        const sql = schema.dropTable(Contact)
        expect(sql).toContain('DROP TABLE IF EXISTS "Contact"')
    })

    it ('does generate CREATE Contact Table', () => {
        const sql = schema.createTable(Contact)
        expect(sql).toContain('CREATE TABLE "Contact"')
        expect(sql).toContain('"id" INTEGER PRIMARY KEY AUTOINCREMENT')
        expect(sql).toContain('"firstName" TEXT NOT NULL')
        expect(sql).toContain('"lastName" TEXT NOT NULL')
        expect(sql).toContain('"email" TEXT NOT NULL')
        expect(sql).toContain('"phone" TEXT')
        expect(sql).toContain('"address" TEXT')
        expect(sql).toContain('"city" TEXT')
        expect(sql).toContain('"state" TEXT')
        expect(sql).toContain('"createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP')
        expect(sql).toContain('"updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP')
    })

    it ('does generate INSERT Contact', () => {
        const sql = schema.insert(Contact)
        expect(sql).toContain('INSERT INTO "Contact" ' + 
            '("firstName", "lastName", "age", "email", "phone", "address", "city", "state", "postCode")' + 
            ' VALUES ($firstName, $lastName, $age, $email, $phone, $address, $city, $state, $postCode)')
    })

    it ('does generate INSERT Contact onlyFields', () => {
        const onlyProps = ['firstName', 'lastName', 'email']
        const sql = schema.insert(Contact, { onlyProps })
        expect(sql).toContain('INSERT INTO "Contact" ("firstName", "lastName", "email") VALUES ($firstName, $lastName, $email)')
    })

    it ('does generate UPDATE Contact', () => {
        const sql = schema.update(Contact)
        expect(sql).toContain('UPDATE "Contact" SET "firstName"=$firstName, "lastName"=$lastName, "age"=$age, ' + 
            '"email"=$email, "phone"=$phone, "address"=$address, "city"=$city, "state"=$state, "postCode"=$postCode, ' + 
            '"createdAt"=$createdAt, "updatedAt"=$updatedAt WHERE "id" = $id')
    })

    it ('should annoatate Contact', () => {

        const C = Contact as any as ReflectMeta
        const $type = C.$type
        const $props = C.$props!
        // console.log($type, $props)

        expect($type.table!.name).toBe('Contact')

        const id = $props.find(c => c.name === 'id')!.column!
        expect(id.primaryKey).toBe(true)
        expect(id.autoIncrement).toBe(true)
        expect(id.type).toBe("INTEGER")

        const firstName = $props.find(c => c.name === 'firstName')?.column!
        expect(firstName.type).toBe("TEXT")
        expect(firstName.required).toBe(true)

        const createdAt = $props.find(c => c.name === 'createdAt')?.column!
        expect(createdAt.type).toBe("DATETIME")
    })
})
