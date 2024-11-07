import { describe, it, expect } from 'bun:test'
import { mysql as $, Table } from '../src'
import { Contact, Order } from './data'
import { ColumnReference } from '../src/types'
import { str } from './utils'

const f = (name:string) => '`' + name + '`'
const [ id, contactId, key, key2, sku, qty, name, cost, total, createdAt, orderId ] = [ 
    f('id'),
    f('contactId'), 
    f('key'), 
    f('key2'),
    f('sku'),
    f('qty'),
    f('name'),
    f('cost'),
    f('total'),
    f('createdAt'),
    f('orderId')
]

describe('MySQL Schema Tests', () => {

    it ('Can generate foreign keys', () => {
        const contactIdRef = (references:ColumnReference) => ({
            name:"contactId",
            type:"INTEGER",
            references
        })

        expect($.schema.sqlForeignKeyDefinition(Order, contactIdRef({ table:Contact })))
            .toBe(`FOREIGN KEY (${contactId}) REFERENCES ${f('Contact')}(${id})`)
        expect($.schema.sqlForeignKeyDefinition(Order, contactIdRef({ table:[Contact,'key'] })))
            .toBe(`FOREIGN KEY (${contactId}) REFERENCES ${f('Contact')}(${key})`)
        expect($.schema.sqlForeignKeyDefinition(Order, contactIdRef({ table:[Contact,'key'], on:["DELETE", "CASCADE"] })))
            .toBe(`FOREIGN KEY (${contactId}) REFERENCES ${f('Contact')}(${key}) ON DELETE CASCADE`)
        expect($.schema.sqlForeignKeyDefinition(Order, contactIdRef({ table:[Contact,['key','key2']], on:["DELETE", "CASCADE"] })))
            .toBe(`FOREIGN KEY (${contactId}) REFERENCES ${f('Contact')}(${key},${key2}) ON DELETE CASCADE`)
    })

    it ('Can generate foreign keys for Order, OrderItem tables', () => {
        class Product {
            sku = ''
            name = ''
            cost = 0.0
        }
        class Order {
            id = 0
            contactId = 0
            total = 0.0
            createdAt = new Date()
        }
        class OrderItem {
            id = 0
            orderId = 0
            sku = ''
            qty = 0
            total = 0.0
        }

        Table(Product, {
            columns: {
                sku:  { type:"TEXT",  primaryKey:true },
                name: { type:"TEXT",  required:true, index:true, unique:true },
                cost: { type:"MONEY", required:true },
            }
        })

        Table(Order, {
            columns: {
                id:        { type:"INTEGER",  autoIncrement:true },
                contactId: { type:"INTEGER",  required:true, references:{ table:Contact, on:["DELETE","CASCADE"] } },
                total:     { type:"MONEY",    required:true },
                createdAt: { type:"DATETIME", defaultValue:"CURRENT_TIMESTAMP" },
            }
        })

        Table(OrderItem, {
            columns: {
                id:      { type:"INTEGER", autoIncrement:true },
                orderId: { type:"INTEGER", required:true, references:{ table:Order,   on:["DELETE","RESTRICT"] } },
                sku:     { type:"TEXT",    required:true, references:{ table:Product, on:["DELETE","RESTRICT"] } },
                qty:     { type:"INTEGER", required:true },
                total:   { type:"MONEY",   required:true }
            }
        })
        
        expect(str($.schema.createTable(Product))).toBe(str(`CREATE TABLE ${f('Product')} ( 
            ${sku} TEXT PRIMARY KEY, 
            ${name} TEXT NOT NULL, 
            ${cost} MONEY NOT NULL
        );
        CREATE UNIQUE INDEX idx_product_name ON ${f('Product')} (${name});`))
        
        expect(str($.schema.createTable(Order))).toBe(str(`CREATE TABLE ${f('Order')} (
            ${id} INTEGER PRIMARY KEY AUTOINCREMENT, 
            ${contactId} INTEGER NOT NULL, 
            ${total} MONEY NOT NULL,
            ${createdAt} DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (${contactId}) REFERENCES ${f('Contact')}(${id}) ON DELETE CASCADE 
        );`))
        
        expect(str($.schema.createTable(OrderItem))).toBe(str(`CREATE TABLE ${f('OrderItem')} (
            ${id} INTEGER PRIMARY KEY AUTOINCREMENT,
            ${orderId} INTEGER NOT NULL,
            ${sku} TEXT NOT NULL,
            ${qty} INTEGER NOT NULL,
            ${total} MONEY NOT NULL,
            FOREIGN KEY (${orderId}) REFERENCES ${f('Order')}(${id}) ON DELETE RESTRICT,
            FOREIGN KEY (${sku}) REFERENCES ${f('Product')}(${sku}) ON DELETE RESTRICT
        );`))
    })
})
