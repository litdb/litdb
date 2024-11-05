import type { SqlBuilder } from "../src"

export function str(q:SqlBuilder|string) {
    if (typeof q == 'string') 
        return q.replaceAll(/\n/g,' ').replaceAll(/\s+/g,' ').trim()
    const { sql } = q.build()
    return sql.replaceAll(/\n/g,' ').replaceAll(/\s+/g,' ').trim()
}

export const selectContact = 'id,firstName,lastName,age,email,phone,address,city,state,postCode,createdAt,updatedAt'
    .split(',').map(c => `"${c}"`).join(', ')

export const selectPerson = 'id,firstName,lastName,email'
    .split(',').map(c => `"${c}"`).join(', ')
