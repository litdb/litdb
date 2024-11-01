import { SqlBuilder } from "../src/types"

export function str(q:SqlBuilder) {
    const { sql } = q.build()
    return sql
}

export const selectContact = 'id,firstName,lastName,age,email,phone,address,city,state,postCode,createdAt,updatedAt'
    .split(',').map(c => `"${c}"`).join(', ')

export const selectPerson = 'id,firstName,lastName,email'
    .split(',').map(c => `"${c}"`).join(', ')
