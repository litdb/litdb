import { SqliteSchema } from "../sqlite/schema"
import { ColumnDefinition } from "../types"

export class PostgreSqlSchema extends SqliteSchema {

    sqlColumnDefinition(col: ColumnDefinition): string {
        let type = this.dataType(col)
        if (col.autoIncrement) {
            type = type == 'BIGINT' ? 'BIGSERIAL' : 'SERIAL'
        }

        let sb = `${this.dialect.quoteColumn(col.name)} ${type}`
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

    sqlTableNames() {
        return "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'"
    }
}
