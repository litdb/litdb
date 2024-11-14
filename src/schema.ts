import { converterFor, DateTimeConverter } from "./converters"
import { Meta } from "./meta"
import type { 
    ClassInstance, ClassParam, DbBinding, Dialect, Fragment, ReflectMeta, ColumnDefinition, TableDefinition, 
    TypeConverter
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
    
    constructor(public dialect:Dialect){}

    converters: { [key: string]: TypeConverter } = {
        ...converterFor(new DateTimeConverter, "DATE", "DATETIME", "TIMESTAMP", "TIMESTAMPZ"),
    }

    sqlTableNames(schema?: string):string { throw new Error(DriverRequired) }

    sqlColumnDefinition(column: ColumnDefinition):string { throw new Error(DriverRequired) }

    sqlForeignKeyDefinition(table: TableDefinition, column: ColumnDefinition):string { throw new Error(DriverRequired) }

    sqlIndexDefinition(table: TableDefinition, column: ColumnDefinition):string { throw new Error(DriverRequired) }

    sqlRowCount(sql:string) {
        return `SELECT COUNT(*) FROM (${sql}) AS COUNT`
    }

    dropTable(table:ClassParam) {
        const meta = Meta.assert(table)
        let sql = `DROP TABLE IF EXISTS ${this.dialect.quoteTable(meta.tableName)}`
        //console.log('Schema.dropTable', sql)
        return sql
    }

    createTable(table:ClassParam) {
        const meta = Meta.assert(table)
        const columns = meta.columns
        let sqlColumns = columns.map(c => this.sqlColumnDefinition(c))
        const foreignKeys = columns.filter(c => c.references)
            .map(c => this.sqlForeignKeyDefinition(meta.table, c))
        const definitions = [
            sqlColumns,
            foreignKeys,
        ].filter(x => x.length)
            .map(x => x.join(',\n  '))
            .join(',\n  ')
        let sql = `CREATE TABLE ${this.dialect.quoteTable(meta.tableName)} (\n  ${definitions}\n);\n`
        const indexes = columns.filter(c => c.index)
            .map(c => `${this.sqlIndexDefinition(meta.table, c)};`);
        if (indexes.length > 0) {
            sql += indexes.join('\n')
        }
        //console.log('Schema.createTable', sql)
        return sql
    }

    insert(table:ClassParam, options?:{ onlyProps?:string[] }) {
        const meta = Meta.assert(table)
        let props = meta.props.filter(x => x.column!!)
        if (options?.onlyProps) {
            props = props.filter(c => options.onlyProps!.includes(c.name))
        }
        let columns = props.map(x => x.column!).filter(c => !c.autoIncrement && !c.defaultValue)
        let sqlColumns = columns.map(c => `${this.dialect.quoteColumn(c.name)}`).join(', ')
        let sqlParams = columns.map((c) => `$${c.name}`).join(', ')
        let sql = `INSERT INTO ${this.dialect.quoteTable(meta.tableName)} (${sqlColumns}) VALUES (${sqlParams})`
        //console.log('Schema.insert', sql)
        return sql
    }

    update(table:ClassParam, options?:{ onlyProps?:string[] }) {
        const meta = Meta.assert(table)
        let props = options?.onlyProps
            ? meta.props.filter(c => options.onlyProps!.includes(c.name) || c.column?.primaryKey)
            : meta.props.filter(x => x.column!!)

        const primaryKeys = props.filter(c => c.column?.primaryKey)
        if (!primaryKeys.length)
            throw new Error(`${meta.name} does not have a PRIMARY KEY`)

        const columns = props.map(x => x.column!)
        const setColumns = columns.filter(c => !c.primaryKey)
        const whereColumns = columns.filter(c => c.primaryKey)
        const setSql = setColumns.map(c => `${this.dialect.quoteColumn(c.name)}=$${c.name}`).join(', ')
        const whereSql = whereColumns.map(c => `${this.dialect.quoteColumn(c.name)} = $${c.name}`).join(' AND ')
        let sql = `UPDATE ${this.dialect.quoteTable(meta.tableName)} SET ${setSql}`
        if (whereSql) {
            sql += ` WHERE ${whereSql}`
        } else {
            throw new Error(`No WHERE clause exists for UPDATE ${meta.tableName}`)
        }
        // console.log('Schema.update', sql)
        return sql
    }

    delete(table:ClassParam, options?:DeleteOptions) {
        const meta = Meta.assert(table)
        let props = meta.props.filter(x => x.column!!)
        const columns = props.map(x => x.column!)
        const whereColumns = columns.filter(c => c.primaryKey)
        let whereSql = whereColumns.map(c => `${this.dialect.quoteColumn(c.name)} = $${c.name}`).join(' AND ')
        if (options?.where) {
            let sql = whereSql ? ' AND ' : ' WHERE '
            const where = IS.arr(options.where) ? options.where : [options.where]
            whereSql += sql + where.join(' AND ')
        }
        let sql = `DELETE FROM ${this.dialect.quoteTable(meta.tableName)}`
        if (whereSql) {
            sql += ` WHERE ${whereSql}`
        } else {
            throw new Error(`No WHERE clause exists for DELETE ${meta.tableName}`)
        }
        // console.log('Schema.delete', sql)
        return sql
    }

    toDbBindings(table:ClassInstance) {
        const values:DbBinding[] = []
        const meta = Meta.assert(table.constructor as ReflectMeta)
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
        const meta = Meta.assert(table.constructor as ReflectMeta)
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
