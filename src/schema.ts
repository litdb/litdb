import { Meta } from "./meta"
import type { ClassInstance, ClassParam, DbBinding, Driver, Fragment, ReflectMeta } from "./types"

type DeleteOptions = {
    /** force delete even with no where clause */
    force?:boolean
    where?:Fragment|Fragment[]
}

export class Schema {
    static metadata: { [id:symbol]: Meta } = {}

    static assertClass(table:ClassParam) : ReflectMeta {
        if (!table)
            throw new Error(`Class must be provided`)
        const cls = ( (table?.constructor as any)?.$id
            ? table?.constructor
            : (table as any).$id ? table : null) as ReflectMeta
        if (!cls) {
            const name = (table as any)?.name ?? table?.constructor?.name
            if (!name)
                throw new Error(`Class or constructor function required`)
            else if (typeof table === 'function' || typeof table.constructor === 'function') 
                throw new Error(`${name} is not a class or constructor function`)
            else
                throw new Error(`${name} does not contain metadata, missing @table?`)            
        }
        return cls
    }

    static assertTable(table:ClassParam) : ReflectMeta {
        const cls = Schema.assertClass(table)
        if (!cls.$type?.table) {
            throw new Error(`${cls.name} does not have a @table annotation`)
        }
        if (!cls.$props || !cls.$props.find((x:any) => x.column!!)) {
            throw new Error(`${cls.name} does not have any @column annotations`)
        }
        return cls as ReflectMeta
    }

    static assertMeta(table:ClassParam) : Meta {
        const cls = Schema.assertClass(table)
        const id = cls.$id as symbol
        return Schema.metadata[id] ?? (Schema.metadata[id] = new Meta(Schema.assertTable(cls)))
    }

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

    static dropTable(table:ClassParam, driver:Driver) {
        const meta = Schema.assertMeta(table)
        let sql = `DROP TABLE IF EXISTS ${driver.dialect.quoteTable(meta.tableName)}`
        //console.log('Schema.dropTable', sql)
        return sql
    }

    static createTable(table:ClassParam, driver:Driver) {
        const meta = Schema.assertMeta(table)
        const columns = meta.columns
        let sqlColumns = columns.map(c => `${driver.sqlColumnDefinition(c)}`).join(',\n    ')
        let sql = `CREATE TABLE ${driver.dialect.quoteTable(meta.tableName)} (\n    ${sqlColumns}\n);\n`
        const indexes = columns.filter(c => c.index)
            .map(c => `${driver.sqlIndexDefinition(meta.table, c)};`);
        if (indexes.length > 0) {
            sql += indexes.join('\n')
        }
        //console.log('Schema.createTable', sql)
        return sql
    }

    static insert(table:ClassParam, driver:Driver, options?:{ onlyProps?:string[] }) {
        const meta = Schema.assertMeta(table)
        let props = meta.props.filter(x => x.column!!)
        if (options?.onlyProps) {
            props = props.filter(c => options.onlyProps!.includes(c.name))
        }
        let columns = props.map(x => x.column!).filter(c => !c.autoIncrement)
        let sqlColumns = columns.map(c => `${driver.dialect.quoteColumn(c.name)}`).join(', ')
        let sqlParams = columns.map((c) => `$${c.name}`).join(', ')
        let sql = `INSERT INTO ${driver.dialect.quoteTable(meta.tableName)} (${sqlColumns}) VALUES (${sqlParams})`
        //console.log('Schema.insert', sql)
        return sql
    }

    static update(table:ClassParam, driver:Driver, options?:{ onlyProps?:string[], force?:boolean }) {
        const meta = Schema.assertMeta(table)
        let props = meta.props.filter(x => x.column!!)
        if (options?.onlyProps) {
            props = props.filter(c => options.onlyProps!.includes(c.name))
        }
        const columns = props.map(x => x.column!)
        const setColumns = columns.filter(c => !c.primaryKey)
        const whereColumns = columns.filter(c => c.primaryKey)
        const setSql = setColumns.map(c => `${driver.dialect.quoteColumn(c.name)}=$${c.name}`).join(', ')
        const whereSql = whereColumns.map(c => `${driver.dialect.quoteColumn(c.name)} = $${c.name}`).join(' AND ')
        let sql = `UPDATE ${driver.dialect.quoteTable(meta.tableName)} SET ${setSql}`
        if (whereSql) {
            sql += ` WHERE ${whereSql}`
        } else if (!options?.force) {
            throw new Error(`No WHERE clause exists for UPDATE ${meta.tableName}, force update with { force:true }`)
        }
        console.log('Schema.update', sql)
        return sql
    }

    static delete(table:ClassParam, driver:Driver, options?:DeleteOptions) {
        const meta = Schema.assertMeta(table)
        let props = meta.props.filter(x => x.column!!)
        const columns = props.map(x => x.column!)
        const whereColumns = columns.filter(c => c.primaryKey)
        let whereSql = whereColumns.map(c => `${driver.dialect.quoteColumn(c.name)} = $${c.name}`).join(' AND ')
        if (options?.where) {
            let sql = whereSql ? ' AND ' : ' WHERE '
            const where = Array.isArray(options.where) ? options.where : [options.where]
            whereSql += sql + where.join(' AND ')
        }
        let sql = `DELETE FROM ${driver.dialect.quoteTable(meta.tableName)}`
        if (whereSql) {
            sql += ` WHERE ${whereSql}`
        } else if (!options?.force) {
            throw new Error(`No WHERE clause exists for DELETE ${meta.tableName}, force delete with { force:true }`)
        }
        console.log('Schema.delete', sql)
        return sql
    }

    static toDbBindings(table:ClassInstance, driver:Driver) {
        const values:DbBinding[] = []
        const meta = Schema.assertMeta(table.constructor as ReflectMeta)
        const props = meta.props.filter(x => x.column!!)

        props.forEach(x => {
            const value = table[x.column!.name]
            const converter = driver.converters[x.column!.type]
            if (converter) {
                const dbValue = converter.toDb(value)
                values.push(dbValue)
            } else {
                values.push(value)
            }
        })
        return values
    }

    static toDbObject(table:ClassInstance, driver:Driver, options?:{ onlyProps?:string[] }) {
        const values: { [key:string]: DbBinding } = {}
        const meta = Schema.assertMeta(table.constructor as ReflectMeta)
        const props = meta.props.filter(x => x.column!!)

        for (const x of props) {
            if (options?.onlyProps && !options.onlyProps.includes(x.name)) continue

            const value = table[x.name]
            const converter = driver.converters[x.column!.type]
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
