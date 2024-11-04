import { converterFor, DateTimeConverter } from "./converters"
import { Meta } from "./meta"
import type { 
    ClassInstance, ClassParam, DbBinding, Dialect, Fragment, ReflectMeta, ColumnDefinition, TableDefinition, 
    TypeConverter
} from "./types"

type DeleteOptions = {
    /** force delete even with no where clause */
    force?:boolean
    where?:Fragment|Fragment[]
}

export const DriverRequired = `Missing Driver Implementation, see: https://github.com/litdb/litdb`
export const DriverRequiredProxy = new Proxy({}, {
    get:(target: {}, key:string|symbol) => {
        throw new Error(DriverRequired)
    }
})

export function assertSql(sql: Fragment|any) {
    if (typeof sql != 'object' || !sql.sql) {
        const desc = typeof sql == 'symbol' 
            ? sql.description
            : Array.isArray(sql)
                ? 'Array'
                : `${sql}`
        throw new Error(`Expected ${'sql`...`'} fragment, received: ${desc}`)
    }
    return sql
}

export class Schema {
    
    constructor(public dialect:Dialect){}

    converters: { [key: string]: TypeConverter } = {
        ...converterFor(DateTimeConverter.instance, "DATE", "DATETIME", "TIMESTAMP", "TIMESTAMPZ"),
    }

    sqlTableNames(schema?: string):string { throw new Error(DriverRequired) }

    sqlColumnDefinition(column: ColumnDefinition):string { throw new Error(DriverRequired) }

    sqlIndexDefinition(table: TableDefinition, column: ColumnDefinition):string { throw new Error(DriverRequired) }

    dropTable(table:ClassParam) {
        const meta = Meta.assertMeta(table)
        let sql = `DROP TABLE IF EXISTS ${this.dialect.quoteTable(meta.tableName)}`
        //console.log('Schema.dropTable', sql)
        return sql
    }

    createTable(table:ClassParam) {
        const meta = Meta.assertMeta(table)
        const columns = meta.columns
        let sqlColumns = columns.map(c => `${this.sqlColumnDefinition(c)}`).join(',\n    ')
        let sql = `CREATE TABLE ${this.dialect.quoteTable(meta.tableName)} (\n    ${sqlColumns}\n);\n`
        const indexes = columns.filter(c => c.index)
            .map(c => `${this.sqlIndexDefinition(meta.table, c)};`);
        if (indexes.length > 0) {
            sql += indexes.join('\n')
        }
        //console.log('Schema.createTable', sql)
        return sql
    }

    insert(table:ClassParam, options?:{ onlyProps?:string[] }) {
        const meta = Meta.assertMeta(table)
        let props = meta.props.filter(x => x.column!!)
        if (options?.onlyProps) {
            props = props.filter(c => options.onlyProps!.includes(c.name))
        }
        let columns = props.map(x => x.column!).filter(c => !c.autoIncrement)
        let sqlColumns = columns.map(c => `${this.dialect.quoteColumn(c.name)}`).join(', ')
        let sqlParams = columns.map((c) => `$${c.name}`).join(', ')
        let sql = `INSERT INTO ${this.dialect.quoteTable(meta.tableName)} (${sqlColumns}) VALUES (${sqlParams})`
        //console.log('Schema.insert', sql)
        return sql
    }

    update(table:ClassParam, options?:{ onlyProps?:string[], force?:boolean }) {
        const meta = Meta.assertMeta(table)
        let props = meta.props.filter(x => x.column!!)
        if (options?.onlyProps) {
            props = props.filter(c => options.onlyProps!.includes(c.name))
        }
        const columns = props.map(x => x.column!)
        const setColumns = columns.filter(c => !c.primaryKey)
        const whereColumns = columns.filter(c => c.primaryKey)
        const setSql = setColumns.map(c => `${this.dialect.quoteColumn(c.name)}=$${c.name}`).join(', ')
        const whereSql = whereColumns.map(c => `${this.dialect.quoteColumn(c.name)} = $${c.name}`).join(' AND ')
        let sql = `UPDATE ${this.dialect.quoteTable(meta.tableName)} SET ${setSql}`
        if (whereSql) {
            sql += ` WHERE ${whereSql}`
        } else if (!options?.force) {
            throw new Error(`No WHERE clause exists for UPDATE ${meta.tableName}, force update with { force:true }`)
        }
        console.log('Schema.update', sql)
        return sql
    }

    delete(table:ClassParam, options?:DeleteOptions) {
        const meta = Meta.assertMeta(table)
        let props = meta.props.filter(x => x.column!!)
        const columns = props.map(x => x.column!)
        const whereColumns = columns.filter(c => c.primaryKey)
        let whereSql = whereColumns.map(c => `${this.dialect.quoteColumn(c.name)} = $${c.name}`).join(' AND ')
        if (options?.where) {
            let sql = whereSql ? ' AND ' : ' WHERE '
            const where = Array.isArray(options.where) ? options.where : [options.where]
            whereSql += sql + where.join(' AND ')
        }
        let sql = `DELETE FROM ${this.dialect.quoteTable(meta.tableName)}`
        if (whereSql) {
            sql += ` WHERE ${whereSql}`
        } else if (!options?.force) {
            throw new Error(`No WHERE clause exists for DELETE ${meta.tableName}, force delete with { force:true }`)
        }
        console.log('Schema.delete', sql)
        return sql
    }

    toDbBindings(table:ClassInstance) {
        const values:DbBinding[] = []
        const meta = Meta.assertMeta(table.constructor as ReflectMeta)
        const props = meta.props.filter(x => x.column!!)

        props.forEach(x => {
            const value = table[x.column!.name]
            const converter = this.converters[x.column!.type]
            if (converter) {
                const dbValue = converter.toDb(value)
                values.push(dbValue)
            } else {
                values.push(value)
            }
        })
        return values
    }

    toDbObject(table:ClassInstance, options?:{ onlyProps?:string[] }) {
        const values: { [key:string]: DbBinding } = {}
        const meta = Meta.assertMeta(table.constructor as ReflectMeta)
        const props = meta.props.filter(x => x.column!!)

        for (const x of props) {
            if (options?.onlyProps && !options.onlyProps.includes(x.name)) continue

            const value = table[x.name]
            const converter = this.converters[x.column!.type]
            if (converter) {
                const dbValue = converter.toDb(value)
                values[x.column!.name] = dbValue
            } else {
                values[x.column!.name] = value
            }
        }
        return values
    }
}
