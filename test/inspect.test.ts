import { describe, it, expect } from 'bun:test'
import { sqlite as $, Inspect, pick } from '../src'
import { Contact, contacts, Order, OrderItem } from './data'
import { str } from './utils'

describe.only('Inspect tests', () => {
    it ('does log objects', () => {
        
        expect(str(Inspect.dump(contacts))).toStartWith(str(`[ {
            id: 1,
            firstName: John,
            lastName: Doe,
            email: john.doe@example.com,
            createdAt: 2025-02-01T00:00:00.000Z,
            updatedAt: 2025-02-01T00:00:00.000Z,
            age: 27,
            phone: 123-456-7890,
            address: 123 Main St,
            city: New York,
            state: NY,
            postCode: 12345
        }`))

        expect(Inspect.dumpTable(pick(contacts, ['id','firstName','age']))).toEqual(
`+----------------------+
| id | firstName | age |
|----------------------|
|  1 | John      |  27 |
|  2 | Jane      |  27 |
|  3 | Alice     |  21 |
|  4 | Bob       |  40 |
|  5 | Charlie   |  50 |
+----------------------+`)

        const contactOrderItems = (() => {
            const q = $.from(Contact,'c')
                .join(Order, { as:'o', on:(c:Contact, o:Order) => $`${c.id} = ${o.contactId}` })
                .join(OrderItem, { as:'i', on:(o:Order, i:OrderItem) => $`${o.id} = ${i.orderId}` })
            return () => q.clone()
        })()

        let q = contactOrderItems()
            .log("debug")
            .where(c => $`${c.id} = 1`)
            .log("debug")
            .select((c,o,i) => $`${c.id}, ${c.firstName}, ${i.orderId}, ${o.total}`)
            .log("debug")

        q = contactOrderItems()
            .log()
            .where(c => $`${c.id} = 1`)
            .log()
            .select((c,o,i) => $`${c.id}, ${c.firstName}, ${i.orderId}, ${o.total}`)
            .log()
        
        // $.log(q)
        // $.log(q.into(Order))

        
        // console.log(1, q.into(Contact).toString(), 2)
        // console.log(`${q.into(Order)}`)
        // $.log(q.into(Order))

        const id = 10
        $.log($.fragment('id = $id', { id }))
        $.log($`city = ${'Austin'}`)
    })
})