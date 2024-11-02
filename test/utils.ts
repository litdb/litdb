import { SqlBuilder } from "../src/types"

export function str(q:SqlBuilder|string) {
    if (typeof q == 'string') 
        return q.replaceAll(/\n/g,' ').replaceAll(/\s+/g,' ')
    const { sql } = q.build()
    return sql.replaceAll(/\n/g,' ').replaceAll(/\s+/g,' ')
}

export const selectContact = 'id,firstName,lastName,age,email,phone,address,city,state,postCode,createdAt,updatedAt'
    .split(',').map(c => `"${c}"`).join(', ')

export const selectPerson = 'id,firstName,lastName,email'
    .split(',').map(c => `"${c}"`).join(', ')
