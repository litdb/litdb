import { describe, it, expect } from 'bun:test'
import { Contact } from './data'
import { sync as db } from './db'
import { SqlBuilder } from '../src/types'

describe('SQLite LIMIT Tests', () => {

    it ('Can use LIMIT on Contacts', () => {
        function assert(query:SqlBuilder, expectedSql:string, expectedParams:Record<string,any> = {}) {
            const { sql, params } = query.build()
            expect(sql).toEndWith(expectedSql)
            expect(params).toEqual(expectedParams)
        }

        assert(db.from(Contact).limit(5), `LIMIT $limit`, { limit: 5 })
        assert(db.from(Contact).take(5), `LIMIT $limit`, { limit: 5 })
        assert(db.from(Contact).limit(undefined, 10), `LIMIT $limit OFFSET $offset`, { limit: -1, offset: 10 })
        assert(db.from(Contact).skip(10), `LIMIT $limit OFFSET $offset`, { limit: -1, offset: 10 })
        assert(db.from(Contact).limit(5, 10), `LIMIT $limit OFFSET $offset`, { limit: 5, offset: 10 })
        assert(db.from(Contact).skip(10).take(5), `LIMIT $limit OFFSET $offset`, { limit: 5, offset: 10 })
    })

})
