import { describe, it, expect } from 'bun:test'
import { DataType } from "../src/model"
import { Contact, contacts } from './data'
import { Schema } from '../src/connection'
import { ReflectMeta } from '../src/types'
import { sync as db, $ } from './db'

describe ('SQLite Create Table Tests', () => {

    it ('does get Contact meta', () => {
        //console.log('Contact', Contact, Contact.name, Contact.constructor, Contact.constructor.name)
        const meta = Schema.assertMeta(Contact)
        expect(meta).toBeDefined()
    })

    it ('does generate DROP Contact Table', () => {
        const sql = Schema.dropTable(Contact, db.driver)
        expect(sql).toContain('DROP TABLE IF EXISTS "Contact"')
    })

    it ('does generate CREATE Contact Table', () => {
        const sql = Schema.createTable(Contact, db.driver)
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
        const sql = Schema.insert(Contact, db.driver)
        expect(sql).toContain('INSERT INTO "Contact" ' + 
            '("firstName", "lastName", "age", "email", "phone", "address", "city", "state", "postCode", "createdAt", "updatedAt")' + 
            ' VALUES ($firstName, $lastName, $age, $email, $phone, $address, $city, $state, $postCode, $createdAt, $updatedAt)')
    })

    it ('does generate INSERT Contact onlyFields', () => {
        const onlyProps = ['firstName', 'lastName', 'email']
        const sql = Schema.insert(Contact, db.driver, { onlyProps })
        expect(sql).toContain('INSERT INTO "Contact" ("firstName", "lastName", "email") VALUES ($firstName, $lastName, $email)')
    })

    it ('does generate UPDATE Contact', () => {
        const sql = Schema.update(Contact, db.driver)
        expect(sql).toContain('UPDATE "Contact" SET "firstName"=$firstName, "lastName"=$lastName, "age"=$age, ' + 
            '"email"=$email, "phone"=$phone, "address"=$address, "city"=$city, "state"=$state, "postCode"=$postCode, ' + 
            '"createdAt"=$createdAt, "updatedAt"=$updatedAt WHERE "id" = $id')
    })

    it ('should generate Contact Table SQL', () => {

        db.dropTable(Contact)

        expect(db.listTables()).not.toContain(Contact.name)

        db.createTable(Contact)

        expect(db.listTables()).toContain(Contact.name)

        //console.log('contacts[0]', contacts[0])
        db.insert(contacts[0])
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
        expect(id.type).toBe(DataType.INTEGER)

        const firstName = $props.find(c => c.name === 'firstName')?.column!
        expect(firstName.type).toBe(DataType.TEXT)
        expect(firstName.required).toBe(true)

        const createdAt = $props.find(c => c.name === 'createdAt')?.column!
        expect(createdAt.type).toBe(DataType.DATETIME)
    })

})
