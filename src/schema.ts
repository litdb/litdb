import { DefaultStrategy } from "./connection"
import { converterFor, DateTimeConverter } from "./converters"
import { Meta } from "./meta"
import { DefaultValues } from "./model"
import { Sql } from "./sql"
import type { 
    ClassInstance, ClassParam, DbBinding, Fragment, ReflectMeta, ColumnDefinition, TableDefinition, 
    TypeConverter,
    Driver,
    DialectTypes,
    ColumnType,
    Constructor
} from "./types"
import { IS } from "./utils"

type DeleteOptions = {
    /** force delete even with no where clause */
    force?:boolean
    where?:Fragment|Fragment[]
}

export const DriverRequired = `Missing Driver Implementation, see: https://litdb.dev/#litdb-drivers`
export const DriverRequiredProxy = new Proxy({}, {
    get:(target: {}, key:string|symbol) => {
        throw new Error(DriverRequired)
    }
})

export function assertSql(sql: Fragment|any) {
    if (!IS.rec(sql) || !sql.sql) {
        const desc = IS.sym(sql)
            ? sql.description
            : IS.arr(sql)
                ? 'Array'
                : `${sql}`
        throw new Error(`Expected ${'sql`...`'} fragment, received: ${desc}`)
    }
    return sql as Fragment
}

export class Schema {
    
    variables: { [key: string]: string } = {
        [DefaultValues.NOW]: 'CURRENT_TIMESTAMP',
        [DefaultValues.MAX_TEXT]: 'TEXT',
        [DefaultValues.TRUE]: '1',
        [DefaultValues.FALSE]: '0',
    }

    converters: { [key: string]: TypeConverter } = {
        ...converterFor(new DateTimeConverter, "DATE", "DATETIME", "TIMESTAMP", "TIMESTAMPZ"),
    }

    constructor(public driver:Driver, public $:ReturnType<typeof Sql.create>, public types:DialectTypes) {
    }

    get dialect() { return this.driver.dialect }
    quoteTable(name: string|TableDefinition) { return this.dialect.quoteTable(name) }
    quoteColumn(name: string|ColumnDefinition) { return this.dialect.quoteColumn(name) }

    sqlTableNames() {
        return "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'"
    }

    sqlRowCount(sql:string) {
        return `SELECT COUNT(*) FROM (${sql}) AS COUNT`
    }

    sqlIndexDefinition(table: TableDefinition, col: ColumnDefinition): string {
        const unique = col.unique ? 'UNIQUE INDEX' : 'INDEX'
        const name = `idx_${table.name}_${col.name}`.toLowerCase()
        return `CREATE ${unique} ${name} ON ${this.quoteTable(table.name)} (${this.quoteColumn(col)})`
    }

    sqlForeignKeyDefinition(table: TableDefinition, col: ColumnDefinition): string {
        const ref = col.references
        if (!ref) return ''
        const $ = this.$
        const refMeta = Array.isArray(ref.table)
            ? Meta.assert(ref.table[0])
            : Meta.assert(ref.table)
        const refKeys = Array.isArray(ref.table)
            ? Array.isArray(ref.table[1]) 
                ? ref.table[1].map(x => $.quoteColumn(x)).join(',') 
                : $.quoteColumn(ref.table[1])
            : refMeta.columns.filter(x => x.primaryKey).map(x => $.quoteColumn(x)).join(',')
        let sql = `FOREIGN KEY (${$.quoteColumn(col)}) REFERENCES ${$.quoteTable(refMeta.table)}${refKeys ? '(' + refKeys + ')' : ''}`
        if (ref.on) {
            sql += ` ON ${ref.on[0]} ${ref.on[1]}`
        }
        return sql
    }

    dataType(col: ColumnDefinition): string {
        let dt = col.type
        let type = this.types.native.includes(dt as ColumnType) ? dt : undefined
        if (!type) {
            for (const [dbType, typeMap] of Object.entries(this.types.map)) {
                if (typeMap.includes(dt as ColumnType)) {
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
            ? ' DEFAULT ' + (this.variables[col.defaultValue] ?? col.defaultValue)
            : ''
    }

    sqlColumnDefinition(col: ColumnDefinition): string {
        let type = this.dataType(col)
        let sb = `${this.quoteColumn(col)} ${type}`
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

    dropTable(table:ClassParam) {
        let sql = `DROP TABLE IF EXISTS ${this.quoteTable(Meta.assert(table).tableName)}`
        //console.log('Schema.dropTable', sql)
        return sql
    }

    createTable(table:ClassParam) {
        const M = Meta.assert(table)
        const cols = M.columns
        let sqlCols = cols.map(c => this.sqlColumnDefinition(c))
        const foreignKeys = cols.filter(c => c.references)
            .map(c => this.sqlForeignKeyDefinition(M.table, c))
        const definitions = [
            sqlCols,
            foreignKeys,
        ].filter(x => x.length)
            .map(x => x.join(',\n  '))
            .join(',\n  ')
        let sql = `CREATE TABLE ${this.quoteTable(M.tableName)} (\n  ${definitions}\n);\n`
        const indexes = cols.filter(c => c.index)
            .map(c => `${this.sqlIndexDefinition(M.table, c)};`);
        if (indexes.length > 0) {
            sql += indexes.join('\n')
        }
        //console.log('Schema.createTable', sql)
        return sql
    }

    insert(table:ClassParam, options?:{ onlyProps?:string[] }) {
        const M = Meta.assert(table)
        let props = M.props.filter(x => x.column!!)
        if (options?.onlyProps) {
            props = props.filter(c => options.onlyProps!.includes(c.name))
        }
        let cols = props.map(x => x.column!).filter(c => !c.autoIncrement && !c.defaultValue)
        let sqlCols = cols.map(c => `${this.quoteColumn(c)}`).join(', ')
        let sqlParams = cols.map((c) => `$${c.name}`).join(', ')
        let sql = `INSERT INTO ${this.quoteTable(M.table)} (${sqlCols}) VALUES (${sqlParams})`
        //console.log('Schema.insert', sql)
        return sql
    }

    update(table:ClassParam, options?:{ onlyProps?:string[] }) {
        const M = Meta.assert(table)
        let props = options?.onlyProps
            ? M.props.filter(c => options.onlyProps!.includes(c.name) || c.column?.primaryKey)
            : M.props.filter(x => x.column!!)

        if (!props.filter(c => c.column?.primaryKey).length)
            throw new Error(`${M.name} does not have a PRIMARY KEY`)

        const cols = props.map(x => x.column!)
        const setCols = cols.filter(c => !c.primaryKey)
        const whereCols = cols.filter(c => c.primaryKey)
        const setSql = setCols.map(c => `${this.quoteColumn(c)}=$${c.name}`).join(', ')
        const whereSql = whereCols.map(c => `${this.quoteColumn(c)} = $${c.name}`).join(' AND ')
        let sql = `UPDATE ${this.quoteTable(M.tableName)} SET ${setSql}`
        if (whereSql) {
            sql += ` WHERE ${whereSql}`
        } else {
            throw new Error(`No WHERE clause exists for UPDATE ${M.tableName}`)
        }
        // console.log('Schema.update', sql)
        return sql
    }

    delete(table:ClassParam, options?:DeleteOptions) {
        const M = Meta.assert(table)
        let props = M.props.filter(x => x.column!!)
        const cols = props.map(x => x.column!)
        const whereCols = cols.filter(c => c.primaryKey)
        let whereSql = whereCols.map(c => `${this.quoteColumn(c)} = $${c.name}`).join(' AND ')
        if (options?.where) {
            let sql = whereSql ? ' AND ' : ' WHERE '
            const where = IS.arr(options.where) ? options.where : [options.where]
            whereSql += sql + where.join(' AND ')
        }
        let sql = `DELETE FROM ${this.quoteTable(M.tableName)}`
        if (whereSql) {
            sql += ` WHERE ${whereSql}`
        } else {
            throw new Error(`No WHERE clause exists for DELETE ${M.tableName}`)
        }
        // console.log('Schema.delete', sql)
        return sql
    }

    toDbBindings(table:ClassInstance) {
        const vals:DbBinding[] = []
        const M = Meta.assert(table.constructor as ReflectMeta)
        const props = M.props.filter(x => x.column!!)

        props.forEach(x => {
            const val = table[x.column!.name]
            const conv = this.converters[x.column!.type]
            if (conv) {
                const dbVal = conv.toDb(val)
                vals.push(dbVal)
            } else {
                vals.push(val)
            }
        })
        return vals
    }

    toDbObject(table:ClassInstance, options?:{ onlyProps?:string[] }) {
        const vals: { [key:string]: DbBinding } = {}
        const M = Meta.assert(table.constructor as ReflectMeta)
        const props = M.props.filter(x => x.column!!)

        for (const x of props) {
            if (options?.onlyProps && !options.onlyProps.includes(x.name)) continue

            const val = table[x.name]
            const conv = this.converters[x.column!.type]
            if (conv) {
                const dbVal = conv.toDb(val)
                vals[x.column!.name] = dbVal
            } else {
                vals[x.column!.name] = val
            }
        }
        return vals
    }

    toResult(o:any, cls:ClassParam|undefined) {
        if (cls && o != null && IS.obj(o)) {
            const M = Meta.assert(cls)        
            const to = new (cls as Constructor<any>)()
            const hasStrategy = !(this.$.dialect.strategy instanceof DefaultStrategy)
            const { dialect, schema } = this.$
            M.props.filter(p => p.column).forEach(p => {
                const val = o[p.column!.alias ?? (hasStrategy 
                    ? dialect.strategy.columnName(p.name) 
                    : p.name
                )]
                const conv = schema.converters[p.column!.type]
                to[p.name] = conv
                    ? conv.fromDb(val)
                    : val
            })
            return to
        }
        return o == null
            ? null
            : o
    }
    
}
