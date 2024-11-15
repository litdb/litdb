import { Schema } from "../schema"
import { ColumnDefinition, TableDefinition } from "../types"

export class MySqlSchema extends Schema {

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
