import { describe, it, expect } from 'bun:test'
import { Contact, Order } from './data'
import { $, sync as db } from './db'
import { str } from './utils'

describe.only('SQLite HAVING Tests', () => {

    it ('Can use HAVING on Contacts', () => {
        expect(str(db.from(Contact)
            .groupBy(c => $`${c.city}`)
            .having(c => $`COUNT(${c.id}) > 5`)
        )).toContain('FROM "Contact" GROUP BY "city" HAVING COUNT("id") > 5')
    })

    it ('Can use HAVING on Contacts and Orders', () => {
        expect(str(db.from(Contact)
            .join(Order, { on:(c,o) => $`${c.id} = ${o.contactId}` })
            .groupBy(c => $`${c.city}`)
            .having(c => $`COUNT(${c.id}) > 5`)
        )).toContain('FROM "Contact"  JOIN "Order" ON "Contact"."id" = "Order"."contactId" GROUP BY "Contact"."city" HAVING COUNT("Contact"."id") > 5')

        const expected = 'JOIN "Order" ON "Contact"."id" = "Order"."contactId"' 
            + ' GROUP BY "Contact"."city"' 
            + ' HAVING COUNT("Contact"."id") > 5' 
            + '  AND SUM("Order"."total") < 1000'

        expect(str(db.from(Contact)
            .join(Order, { on:(c,o) => $`${c.id} = ${o.contactId}` })
            .groupBy(c => $`${c.city}`)
            .having(c => $`COUNT(${c.id}) > 5`)
            .having((_,o) => $`SUM(${o.total}) < 1000`)
        )).toContain(expected)

        expect(str(db.from(Contact)
            .join(Order, { on:(c,o) => $`${c.id} = ${o.contactId}` })
            .groupBy(c => $`${c.city}`)
            .having($.having(Contact,Order)
                .add(c => $`COUNT(${c.id}) > 5`)
                .add((_,o) => $`SUM(${o.total}) < 1000`))
        )).toContain(expected)
    })

    it ('Can use HAVING on Contacts and Orders using aliases', () => {
        expect(str(db.from(Contact, 'c')
            .join(Order, { as:'o', on:(c,o) => $`${c.id} = ${o.contactId}` })
            .groupBy(c => $`${c.city}`)
            .having(c => $`COUNT(${c.id}) > 5`)
        )).toContain('FROM "Contact" c  JOIN "Order" o ON c."id" = o."contactId" GROUP BY c."city" HAVING COUNT(c."id") > 5')

        expect(str(db.from(Contact, 'c')
            .join(Order, { as:'o', on:(c,o) => $`${c.id} = ${o.contactId}` })
            .groupBy(c => $`${c.city}`)
            .having(c => $`COUNT(${c.id}) > 5`)
            .having((_,o) => $`SUM(${o.total}) < 1000`)
        )).toContain('FROM "Contact" c  JOIN "Order" o ON c."id" = o."contactId" GROUP BY c."city" HAVING COUNT(c."id") > 5')
    })

    it ('Can use mutliple HAVINGs on Contacts and Orders using aliases', () => {
        const expected = 'FROM "Contact" c  JOIN "Order" o ON c."id" = o."contactId"' 
        + ' GROUP BY c."city"' 
        + ' HAVING COUNT(c."id") > 5'
        + '  AND SUM(o."total") < 1000'
        expect(str(db.from(Contact, 'c')
            .join(Order, { as:'o', on:(c,o) => $`${c.id} = ${o.contactId}` })
            .groupBy(c => $`${c.city}`)
            .having(c => $`COUNT(${c.id}) > 5`)
            .having((_,o) => $`SUM(${o.total}) < 1000`)
        )).toContain(expected)
    })

})
