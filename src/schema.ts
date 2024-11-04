import { Meta } from "./meta"
import type { ClassInstance, ClassParam, DbBinding, Driver, Fragment, ReflectMeta } from "./types"

type DeleteOptions = {
    /** force delete even with no where clause */
    force?:boolean
    where?:Fragment|Fragment[]
}

export class Schema {

    static assertSql(sql: Fragment|any) {
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

    constructor(public driver:Driver){}

    public static for(driver:Driver) {
        return new Schema(driver)
    }

    dropTable(table:ClassParam) {
        const meta = Meta.assertMeta(table)
        let sql = `DROP TABLE IF EXISTS ${this.driver.dialect.quoteTable(meta.tableName)}`
        //console.log('Schema.dropTable', sql)
        return sql
    }

    createTable(table:ClassParam) {
        const meta = Meta.assertMeta(table)
        const columns = meta.columns
        let sqlColumns = columns.map(c => `${this.driver.sqlColumnDefinition(c)}`).join(',\n    ')
        let sql = `CREATE TABLE ${this.driver.dialect.quoteTable(meta.tableName)} (\n    ${sqlColumns}\n);\n`
        const indexes = columns.filter(c => c.index)
            .map(c => `${this.driver.sqlIndexDefinition(meta.table, c)};`);
        if (indexes.length > 0) {
            sql += indexes.join('\n')
        }
        //console.log('Schema.createTable', sql)
        return sql
    }

    insert(table:ClassParam, options?:{ onlyProps?:string[] }) {
        const meta = Meta.assertMeta(table)
        const dialect = this.driver.dialect
        let props = meta.props.filter(x => x.column!!)
        if (options?.onlyProps) {
            props = props.filter(c => options.onlyProps!.includes(c.name))
        }
        let columns = props.map(x => x.column!).filter(c => !c.autoIncrement)
        let sqlColumns = columns.map(c => `${dialect.quoteColumn(c.name)}`).join(', ')
        let sqlParams = columns.map((c) => `$${c.name}`).join(', ')
        let sql = `INSERT INTO ${dialect.quoteTable(meta.tableName)} (${sqlColumns}) VALUES (${sqlParams})`
        //console.log('Schema.insert', sql)
        return sql
    }

    update(table:ClassParam, options?:{ onlyProps?:string[], force?:boolean }) {
        const meta = Meta.assertMeta(table)
        const dialect = this.driver.dialect
        let props = meta.props.filter(x => x.column!!)
        if (options?.onlyProps) {
            props = props.filter(c => options.onlyProps!.includes(c.name))
        }
        const columns = props.map(x => x.column!)
        const setColumns = columns.filter(c => !c.primaryKey)
        const whereColumns = columns.filter(c => c.primaryKey)
        const setSql = setColumns.map(c => `${dialect.quoteColumn(c.name)}=$${c.name}`).join(', ')
        const whereSql = whereColumns.map(c => `${dialect.quoteColumn(c.name)} = $${c.name}`).join(' AND ')
        let sql = `UPDATE ${dialect.quoteTable(meta.tableName)} SET ${setSql}`
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
        const dialect = this.driver.dialect
        let props = meta.props.filter(x => x.column!!)
        const columns = props.map(x => x.column!)
        const whereColumns = columns.filter(c => c.primaryKey)
        let whereSql = whereColumns.map(c => `${dialect.quoteColumn(c.name)} = $${c.name}`).join(' AND ')
        if (options?.where) {
            let sql = whereSql ? ' AND ' : ' WHERE '
            const where = Array.isArray(options.where) ? options.where : [options.where]
            whereSql += sql + where.join(' AND ')
        }
        let sql = `DELETE FROM ${dialect.quoteTable(meta.tableName)}`
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
            const converter = this.driver.converters[x.column!.type]
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
            const converter = this.driver.converters[x.column!.type]
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
