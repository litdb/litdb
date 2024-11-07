import type { Dialect, Fragment } from "../types"
import { DefaultStrategy } from "../connection"
import { Sql } from "../sql"
import { isQuoted } from "../utils"

export class SqliteDialect implements Dialect {
    $:ReturnType<typeof Sql.create>
    strategy:DefaultStrategy = new DefaultStrategy()
    
    constructor() {
        this.$ = Sql.create(this)
    }

    quote(name: string): string { return isQuoted(name) ? name : `"${name}"` }
    
    quoteTable(name: string): string { return isQuoted(name) ? name : this.quote(this.strategy.tableName(name)) }

    quoteColumn(name: string): string { return isQuoted(name) ? name : this.quote(this.strategy.columnName(name)) }

    sqlLimit(offset?: number, limit?: number): Fragment {
        if (offset == null && limit == null)
            throw new Error(`Invalid argument sqlLimit(${offset}, ${limit})`)
        const frag = offset
            ? this.$.fragment(`LIMIT $limit OFFSET $offset`, { offset, limit:limit ?? -1 })
            : this.$.fragment(`LIMIT $limit`, { limit })
        return frag
    }
}
