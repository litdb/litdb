import { Schema } from "../schema"
import { ColumnDefinition } from "../types"

export class PostgreSqlSchema extends Schema {

    sqlColumnDefinition(col: ColumnDefinition): string {
        let type = this.dataType(col)
        if (col.autoIncrement) {
            type = type == 'BIGINT' ? 'BIGSERIAL' : 'SERIAL'
        }

        let sb = `${this.quoteColumn(col)} ${type}`
        if (col.primaryKey) {
            sb += ' PRIMARY KEY'
        }
        if (col.required) {
            sb += ' NOT NULL'
        }
        if (col.unique && !col.index) {
            sb += ' UNIQUE'
        }
        sb += this.defaultValue(col)
        return sb
    }

    sqlRowCount(sql:string) {
        return `SELECT COUNT(*)::int FROM (${sql}) AS COUNT`
    }
}
