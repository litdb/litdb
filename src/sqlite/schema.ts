import type { ColumnDefinition, Driver, Fragment, TableDefinition, DialectTypes, ColumnType } from "../types"
import { Sql } from "../sql"
import { Schema } from "../schema"
import { Meta } from "../meta"

export type DriverExt = Driver & {
    $:ReturnType<typeof Sql.create>, 
    types: DialectTypes, 
    variables:{ [key: string]: string }
}

export class SqliteSchema extends Schema {

    constructor(public driver:DriverExt) {
        super(driver.dialect)
    }

    sqlTableNames(): string {
        return "SELECT name FROM sqlite_master WHERE type ='table' AND name NOT LIKE 'sqlite_%'"
    }

    sqlIndexDefinition(table: TableDefinition, col: ColumnDefinition): string {
        const unique = col.unique ? 'UNIQUE INDEX' : 'INDEX'
        const name = `idx_${table.name}_${col.name}`.toLowerCase()
        return `CREATE ${unique} ${name} ON ${this.dialect.quoteTable(table.name)} (${this.dialect.quoteColumn(col.name)})`
    }

    sqlForeignKeyDefinition(table: TableDefinition, col: ColumnDefinition): string {
        const ref = col.references
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
        let sql = `FOREIGN KEY (${$.quoteColumn(col.name)}) REFERENCES ${$.quoteTable(refMeta.tableName)}${refKeys ? '(' + refKeys + ')' : ''}`
        if (ref.on) {
            sql += ` ON ${ref.on[0]} ${ref.on[1]}`
        }
        return sql
    }

    dataType(col: ColumnDefinition): string {
        let dt = col.type
        let type = this.driver.types.native.includes(dt as ColumnType) ? dt : undefined
        if (!type) {
            for (const [dbType, typeMapping] of Object.entries(this.driver.types.map)) {
                if (typeMapping.includes(dt as ColumnType)) {
                    type = dbType
                    break
                }
            }
        }
        return !type
            ? dt
            : type
    }

    defaultValue(col: ColumnDefinition): string {
        return col.defaultValue
            ? ' DEFAULT ' + (this.driver.variables[col.defaultValue] ?? col.defaultValue)
            : ''
    }

    sqlColumnDefinition(col: ColumnDefinition): string {
        let type = this.dataType(col)
        let sb = `${this.dialect.quoteColumn(col.name)} ${type}`
        if (col.primaryKey) {
            sb += ' PRIMARY KEY'
        }
        if (col.autoIncrement) {
            sb += ' AUTOINCREMENT'
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

    sqlLimit(offset?: number, limit?: number): Fragment {
        if (offset == null && limit == null)
            throw new Error(`Invalid argument sqlLimit(${offset}, ${limit})`)
        const frag = offset
            ? this.driver.$.sql(`LIMIT $limit OFFSET $offset`, { offset, limit:limit ?? -1 })
            : this.driver.$.sql(`LIMIT $limit`, { limit })
        return frag
    }
}
