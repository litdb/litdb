import { DataType, table, column, DefaultValues, Table } from "../src/model"

@table()
export class Contact {
    constructor(data?: Partial<Contact>) { Object.assign(this, data) }

    @column(DataType.INTEGER, { autoIncrement: true })
    id: number = 0
    
    @column(DataType.TEXT, { required: true })
    firstName: string = ''
    
    @column(DataType.TEXT, { required: true })
    lastName: string = ''
    
    @column(DataType.INTEGER)
    age?: number
    
    @column(DataType.TEXT, { required: true })
    email: string = ''
    
    @column(DataType.TEXT)
    phone?: string
    
    @column(DataType.TEXT)
    address?: string
    
    @column(DataType.TEXT)
    city?: string
    
    @column(DataType.TEXT)
    state?: string
    
    @column(DataType.TEXT)
    postCode?: string
    
    @column(DataType.DATETIME, { defaultValue:DefaultValues.NOW })
    createdAt: Date = new Date()
    
    @column(DataType.DATETIME, { defaultValue:DefaultValues.NOW })
    updatedAt: Date = new Date()
}

@table()
export class Order {
    constructor(data?: Partial<Order>) { Object.assign(this, data) }

    @column("INTEGER", { autoIncrement:true })
    id: number = 0

    @column("INTEGER", { required:true })
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

@table()
export class OrderItem {
    @column("INTEGER", { autoIncrement:true })
    id: number = 0

    @column("INTEGER", { required:true })
    orderId: number = 0

    @column(DataType.TEXT, { required:true })
    name: string = ''
}

@table()
export class Freight {
    @column("INTEGER", { autoIncrement:true })
    id: number = 0

    @column(DataType.TEXT, { required:true })
    name: string = ''
}

export const contacts = [
    new Contact({
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
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
