import { SqliteSchema } from "../sqlite/schema"
import { ColumnDefinition, ColumnType } from "../types"

export class PostgreSqlSchema extends SqliteSchema {

    sqlColumnDefinition(column: ColumnDefinition): string {
        let dataType = column.type
        let type = this.driver.types.native.includes(dataType as ColumnType) ? dataType : undefined
        if (!type) {
            for (const [sqliteType, typeMapping] of Object.entries(this.driver.types.map)) {
                if (typeMapping.includes(dataType as ColumnType)) {
                    type = sqliteType
                    break
                }
            }
        }
        if (!type) type = dataType

        if (column.autoIncrement) {
            type = type == 'BIGINT' ? 'BIGSERIAL' : 'SERIAL'
        }

        let sb = `${this.dialect.quoteColumn(column.name)} ${type}`
        if (column.primaryKey) {
            sb += ' PRIMARY KEY'
        }
        if (column.required) {
            sb += ' NOT NULL'
        }
        if (column.unique && !column.index) {
            sb += ' UNIQUE'
        }
        if (column.defaultValue) {
            const val = this.driver.variables[column.defaultValue] ?? column.defaultValue
            sb += ` DEFAULT ${val}`
        }

        return sb
    }
}
