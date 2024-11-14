import { converterFor } from "../converters"
import { DriverExt, SqliteSchema } from "../sqlite/schema"
import { ColumnDefinition, TableDefinition, TypeConverter } from "../types"
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

export class MySqlSchema extends SqliteSchema {

    constructor(public driver:DriverExt) {
        super(driver)
        Object.assign(this.converters, 
            converterFor(new DateConverter, "DATE", "DATETIME", "TIMESTAMP", "TIMESTAMPZ"), 
            driver.converters)
    }

    sqlIndexDefinition(table: TableDefinition, col: ColumnDefinition): string {
        const unique = col.unique ? 'UNIQUE INDEX' : 'INDEX'
        const name = `idx_${table.name}_${col.name}`.toLowerCase()
        const indexSize = col.type.endsWith('TEXT') ? '(255)' : ''
        return `CREATE ${unique} ${name} ON ${this.dialect.quoteTable(table.name)} (${this.dialect.quoteColumn(col.name)}${indexSize})`
    }

    sqlColumnDefinition(col: ColumnDefinition): string {
        let type = this.dataType(col)
        let sb = `${this.dialect.quoteColumn(col.name)} ${type}`
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
        return "SELECT table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema = DATABASE()"
    }
}
