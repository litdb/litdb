import type { ColumnDefinition, Driver, Fragment, TableDefinition, DialectTypes, ColumnType } from "../types"
import { Sql } from "../sql"
import { Schema } from "../schema"
import { Meta } from "../meta"

export class SqliteSchema extends Schema {

    constructor(public driver:Driver & {
        $:ReturnType<typeof Sql.create>, 
        types: DialectTypes, 
        variables:{ [key: string]: string }}) {
        super(driver.dialect)
    }

    sqlTableNames(): string {
        return "SELECT name FROM sqlite_master WHERE type ='table' AND name NOT LIKE 'sqlite_%'"
    }

    sqlIndexDefinition(table: TableDefinition, column: ColumnDefinition): string {
        const unique = column.unique ? 'UNIQUE INDEX' : 'INDEX'
        const name = `idx_${table.name}_${column.name}`.toLowerCase()
        return `CREATE ${unique} ${name} ON ${this.dialect.quoteTable(table.name)} (${this.dialect.quoteColumn(column.name)})`
    }

    sqlForeignKeyDefinition(table: TableDefinition, column: ColumnDefinition): string {
        const ref = column.references
        if (!ref) return ''
        const $ = this.driver.$
        const refMeta = Array.isArray(ref.table)
            ? Meta.assert(ref.table[0])
            : Meta.assert(ref.table)
        const refKeys = Array.isArray(ref.table)
            ? Array.isArray(ref.table[1]) 
                ? ref.table[1].map(x => $.quoteColumn(x)).join(',') 
                : $.quoteColumn(ref.table[1])
            : refMeta.columns.filter(x => x.primaryKey).map(x => $.quoteColumn(x.name)).join(',')
        let sql = `FOREIGN KEY (${$.quoteColumn(column.name)}) REFERENCES ${$.quoteTable(refMeta.tableName)}${refKeys ? '(' + refKeys + ')' : ''}`
        if (ref.on) {
            sql += ` ON ${ref.on[0]} ${ref.on[1]}`
        }
        return sql
    }

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

        let sb = `${this.dialect.quoteColumn(column.name)} ${type}`
        if (column.primaryKey) {
            sb += ' PRIMARY KEY'
        }
        if (column.autoIncrement) {
            sb += ' AUTOINCREMENT'
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

    sqlLimit(offset?: number, limit?: number): Fragment {
        if (offset == null && limit == null)
            throw new Error(`Invalid argument sqlLimit(${offset}, ${limit})`)
        const frag = offset
            ? this.driver.$.fragment(`LIMIT $limit OFFSET $offset`, { offset, limit:limit ?? -1 })
            : this.driver.$.fragment(`LIMIT $limit`, { limit })
        return frag
    }
}
