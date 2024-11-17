import type { Fragment } from "../types"
import { DialectBase } from "../connection"

export class PostgreSqlDialect extends DialectBase {

    sqlLimit(offset?: number, limit?: number): Fragment {
        if (offset == null && limit == null)
            throw new Error(`Invalid argument sqlLimit(${offset}, ${limit})`)
        const frag = offset
            ? (limit 
                ? this.$.sql(`LIMIT $limit OFFSET $offset`, { offset, limit }) 
                : this.$.sql(`OFFSET $offset`, { offset }))
            : this.$.sql(`LIMIT $limit`, { limit })
        return frag
    }
}
