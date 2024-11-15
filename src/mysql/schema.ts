import { converterFor } from "../converters"
import { Schema } from "../schema"
import { Sql } from "../sql"
import { ColumnDefinition, DialectTypes, Driver, TableDefinition, TypeConverter } from "../types"
import { dateISOString, toDate } from "../utils"

class DateConverter implements TypeConverter
{
    toDb(value: any) {
        const d = toDate(value)
        return d ? dateISOString(d).replace('T',' ') : null
    }
    fromDb(value: any) {
        if (!value) return null
        return toDate(value)
    }
}

export class MySqlSchema extends Schema {

    constructor(driver:Driver, $:ReturnType<typeof Sql.create>, types:DialectTypes) {
        super(driver, $, types)
        Object.assign(driver.schema.converters, 
            converterFor(new DateConverter, "DATE", "DATETIME", "TIMESTAMP", "TIMESTAMPZ"))
    }

    sqlIndexDefinition(table: TableDefinition, col: ColumnDefinition): string {
        const unique = col.unique ? 'UNIQUE INDEX' : 'INDEX'
        const name = `idx_${table.name}_${col.name}`.toLowerCase()
        const indexSize = col.type.endsWith('TEXT') ? '(255)' : ''
        return `CREATE ${unique} ${name} ON ${this.quoteTable(table.name)} (${this.quoteColumn(col.name)}${indexSize})`
    }

    sqlColumnDefinition(col: ColumnDefinition): string {
        let type = this.dataType(col)
        let sb = `${this.quoteColumn(col.name)} ${type}`
        if (col.primaryKey) {
            sb += ' PRIMARY KEY'
        }
        if (col.autoIncrement) {
            sb += ' AUTO_INCREMENT'
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
    
    sqlTableNames() {
        return super.sqlTableNames() + ' AND table_schema = DATABASE()'
    }
}
