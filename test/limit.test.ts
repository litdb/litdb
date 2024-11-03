import { describe, it, expect } from 'bun:test'
import type { SqlBuilder } from '../src/types'
import { sqlite as $ } from '../src'
import { Contact } from './data'

describe('SQLite LIMIT Tests', () => {

    it ('Can use LIMIT on Contacts', () => {
        function assert(query:SqlBuilder, expectedSql:string, expectedParams:Record<string,any> = {}) {
            const { sql, params } = query.build()
            expect(sql).toEndWith(expectedSql)
            expect(params).toEqual(expectedParams)
        }

        assert($.from(Contact).limit(5), `LIMIT $limit`, { limit: 5 })
        assert($.from(Contact).take(5), `LIMIT $limit`, { limit: 5 })
        assert($.from(Contact).limit(undefined, 10), `LIMIT $limit OFFSET $offset`, { limit: -1, offset: 10 })
        assert($.from(Contact).skip(10), `LIMIT $limit OFFSET $offset`, { limit: -1, offset: 10 })
        assert($.from(Contact).limit(5, 10), `LIMIT $limit OFFSET $offset`, { limit: 5, offset: 10 })
        assert($.from(Contact).skip(10).take(5), `LIMIT $limit OFFSET $offset`, { limit: 5, offset: 10 })
    })

})
