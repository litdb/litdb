import { DialectBase } from "../connection"
import type { Fragment } from "../types"
import { isQuoted } from "../utils"

export class MySqlDialect extends DialectBase {

    quote(name: string): string { return isQuoted(name) ? name : "`" + name + "`" }

    sqlLimit(offset?: number, limit?: number): Fragment {
        if (offset == null && limit == null)
            throw new Error(`Invalid argument sqlLimit(${offset}, ${limit})`)
        const f = offset
            ? (limit 
                ? this.$.sql(`LIMIT $offset, $limit`, { offset, limit }) 
                : this.$.sql(`LIMIT $offset, 18446744073709551615`, { offset }))
            : this.$.sql(`LIMIT $limit`, { limit })
        return f
    }
}
