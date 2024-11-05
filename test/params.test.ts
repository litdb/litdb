import { describe, it, expect } from 'bun:test'
import { sqlite as $ } from '../src'
import { Contact, Order, OrderItem } from './data'
import { str } from './utils'

describe('should handle params', () => {

  it('does use and merge correct params', () => {
    const contactId = 1
    const orderId = 2
    const freightId = 3
    const city = 'Austin'
    const exists = $.from(Order)
        .where(o => $`${o.id} = ${orderId} && ${o.freightId} = ${freightId + 1}`)
        .select('*')

    var { sql, params } = exists.build()
    expect(str(sql)).toBe('SELECT * FROM "Order" WHERE "id" = $_1 && "freightId" = $_2')
    expect(params).toEqual({ _1:orderId, _2:freightId+1 })

    let q1 = $.from(Contact).as('c')
    let q2 = q1.join(Order, { on:(c, o) => $`${c.id} = ${o.contactId}` })
    expect(q2.params).toEqual({ })

    let q3 = q2.join(OrderItem, { on:(o:Order, i:OrderItem, c:Contact) => $`${o.id} = ${i.orderId} AND ${o.id} == ${orderId}` })
    expect(q3.params).toEqual({ _1: orderId })

    q3.where(c => $`${c.id} = ${contactId}`)
    expect(q3.params).toEqual({ _1: orderId, _2:contactId })

    q3.and`EXISTS (${exists})`
      .and(c => $`${c.city} = ${city}`)
      .select('*')

    var { sql, params } = q3.build()
    expect(str(sql)).toBe(str(`SELECT * FROM "Contact" c 
      JOIN "Order" ON c."id" = "Order"."contactId" 
      JOIN "OrderItem" ON "Order"."id" = "OrderItem"."orderId" AND "Order"."id" == $_1
      WHERE c."id" = $_2
      AND EXISTS (SELECT * FROM "Order" WHERE "id" = $_3 && "freightId" = $_4) 
      AND c."city" = $_5`))

    expect(params).toEqual({ _1: orderId, _2:contactId, _3:orderId, _4:freightId+1, _5:city })
  })

})
