import { table, column, DefaultValues, Table } from "../src"

@table()
export class Contact {
    constructor(data?: Partial<Contact>) { Object.assign(this, data) }

    @column("INTEGER", { autoIncrement: true })
    id = 0
    
    @column("TEXT", { required: true })
    firstName = ''
    
    @column("TEXT", { required: true })
    lastName = ''
    
    @column("INTEGER")
    age?: number
    
    @column("TEXT", { required: true })
    email = ''
    
    @column("TEXT")
    phone?: string
    
    @column("TEXT")
    address?: string
    
    @column("TEXT")
    city?: string
    
    @column("TEXT")
    state?: string
    
    @column("TEXT")
    postCode?: string
    
    @column("DATETIME", { defaultValue:DefaultValues.NOW })
    createdAt = new Date(2025,1,1)
    
    @column("DATETIME", { defaultValue:DefaultValues.NOW })
    updatedAt = new Date(2025,1,1)
}

@table()
export class Order {
    constructor(data?: Partial<Order>) { Object.assign(this, data) }

    @column("INTEGER", { autoIncrement:true })
    id: number = 0

    @column("INTEGER", { required:true, references:{ table:Contact, on:["DELETE","CASCADE"] } })
    contactId: number = 0

    @column("INTEGER")
    freightId?: number

    @column("INTEGER")
    cost: number = 0

    @column("INTEGER")
    qty: number = 0

    @column("INTEGER")
    total: number = 0
}

Table(Order, {
    columns: {
        contactId: { type:"TEXT", references:{ table:Contact, on:["DELETE","CASCADE"] } }
    }
})

@table()
export class OrderItem {
    @column("INTEGER", { autoIncrement:true })
    id: number = 0

    @column("INTEGER", { required:true })
    orderId: number = 0

    @column("TEXT", { required:true })
    name: string = ''
}

@table()
export class Freight {
    @column("INTEGER", { autoIncrement:true })
    id: number = 0

    @column("TEXT", { required:true })
    name: string = ''
}

export const contacts = [
    new Contact({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        age: 27,
        email: 'john.doe@example.com',
        phone: '123-456-7890',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        postCode: '12345',
    }),
    new Contact({
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        age: 27,
        email: 'jane.smith@example.com',
        phone: '098-765-4321',
        address: '456 Elm St',
        city: 'Los Angeles',
        state: 'CA',
        postCode: '12345',
    }),
    new Contact({
        id: 3,
        firstName: 'Alice',
        lastName: 'Johnson',
        age: 21,
        email: 'alice.johnson@example.com',
        phone: '555-123-4567',
        address: '789 Oak St',
        city: 'Seattle',
        state: 'WA',
        postCode: '12345',
    }),
    new Contact({
        id: 4,
        firstName: 'Bob',
        lastName: 'Williams',
        age: 40,
        email: 'bob.williams@example.com',
        phone: '111-222-3333',
        address: '321 Pine St',
        city: 'Chicago',
        state: 'IL',
        postCode: '12345',
    }),
    new Contact({
        id: 5,
        firstName: 'Charlie',
        lastName: 'Brown',
        age: 50,
        email: 'charlie.brown@example.com',
        phone: '999-888-7777',
        address: '654 Cedar St',
        city: 'Austin',
        state: 'TX',
        postCode: '12345',
    })
]

@table({ alias:'Contact' })
export class Person {
    constructor(data?: Partial<Person>) { Object.assign(this, data) }

    @column("INTEGER", { alias:'id', autoIncrement: true })
    key: number = 0
    
    @column("TEXT", { alias:'firstName', required: true })
    name: string = ''
    
    @column("TEXT", { alias:'lastName', required: true })
    surname: string = ''
    
    @column("TEXT", { required: true })
    email: string = ''    
}

export class DynamicPerson {
    constructor(data?: Partial<DynamicPerson>) { Object.assign(this, data) }
    key: number = 0
    name: string = ''
    surname?: string
    email?: string
}

Table(DynamicPerson, {
    table: { alias:'Contact' },
    columns: {
        key: { alias: 'id', type:"TEXT", required:true },
        name: { alias: 'firstName', type:"TEXT", required:true },
        surname: { alias: 'lastName', type:"TEXT", required:true },
        email: { type:"TEXT", required:true },    
    }
})

export const people = contacts.map(c => new Person({
    key: c.id,
    name: c.firstName,
    surname: c.lastName,
    email: c.email
}))

export const dynamicPeople = people.map(c => new DynamicPerson(c))

export function customerOrderTables() {
    @table() class Product {
        constructor(data?: Partial<Product>) { Object.assign(this, data) }
        @column("INTEGER", { autoIncrement:true, alias:'sku' }) id = ''
        @column("TEXT",    { required:true }) name = ''
        @column("MONEY",   { required:true }) cost = 0.0
    }
    @table() class Contact {
        constructor(data?: Partial<Contact>) { Object.assign(this, data) }
        @column("INTEGER",  { autoIncrement:true }) id = 0
        @column("TEXT",     { required:true }) name = ''
        @column("TEXT",     { required:true, index:true, unique:true }) email = ''
        @column("DATETIME", { defaultValue:"CURRENT_TIMESTAMP" }) createdAt = new Date()
    }
    @table() class Order {
        constructor(data?: Partial<Order>) { Object.assign(this, data) }
        @column("INTEGER",  { autoIncrement:true }) id = 0
        @column("INTEGER",  { references:{ table:Contact, on:["DELETE","CASCADE"] } }) contactId = 0
        @column("MONEY")    total = 0.0
        @column("DATETIME", { defaultValue:"CURRENT_TIMESTAMP" }) createdAt = new Date()
    }
    @table() class OrderItem {
        constructor(data?: Partial<OrderItem>) { Object.assign(this, data) }
        @column("INTEGER", { autoIncrement:true }) id = 0
        @column("INTEGER", { references:{ table:Order, on:["DELETE","RESTRICT"] } }) orderId = 0
        @column("INTEGER", { references:{ table:Product } }) sku = ''
        @column("INTEGER") qty = 0
        @column("MONEY")   total = 0.0
    }
    return { Product, Contact, Order, OrderItem }
}