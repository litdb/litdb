import type { 
    Driver, DbBinding, ReflectMeta, ClassParam, ClassInstance, TableDefinition, 
    Fragment, SqlBuilder, Statement, Constructor, 
    TypeRef
} from "./types"
import { DeleteQuery } from "./builders/delete"
import { SelectQuery } from "./builders/select"
import { UpdateQuery } from "./builders/update"
import { Sql } from "./query"
import { asRef, asType, propsWithValues } from "./utils"

export class Meta {
    constructor(public cls:ReflectMeta) {
        if (!cls) throw new Error(`Class must be provided`)
        if (!cls.$type) throw new Error(`Class ${cls.name ?? cls} have a $type property`)
    }

    get name() { return this.cls.$type?.name ?? this.cls.name }

    get tableName() {
        const cls = this.cls
        const ret = cls.$type?.table?.alias ?? cls.$type?.name ?? cls.name 
        if (!ret) throw new Error(`Table name not found for ${cls.name}`)
        return ret
    }

    get type() { return this.cls.$type }
    get table() { 
        const ret = this.type.table
        if (!ret) throw new Error(`Table definition not found for ${this.cls.name}`)
        return ret
    }
    get props() { 
        return this.cls.$props ?? [] 
    }
    get columns() { 
        return this.props.filter(x => x.column).map(x => x.column!!)
    }
}

type InsertOptions = { 
    /** only insert these props */
    onlyProps?:string[]
    /** only insert columns with values */
    onlyWithValues?:boolean 
}
type UpdateOptions = {
    /** only update these props */
    onlyProps?:string[] 
    /** only update columns with values */
    onlyWithValues?:boolean
    /** force update even with no where clause */
    force?:boolean
}
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
        let sql = `DROP TABLE IF EXISTS ${driver.quoteTable(meta.tableName)}`
        //console.log('Schema.dropTable', sql)
        return sql
    }

    static createTable(table:ClassParam, driver:Driver) {
        const meta = Schema.assertMeta(table)
        const columns = meta.columns
        let sqlColumns = columns.map(c => `${driver.sqlColumnDefinition(c)}`).join(',\n    ')
        let sql = `CREATE TABLE ${driver.quoteTable(meta.tableName)} (\n    ${sqlColumns}\n);\n`
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
        let sqlColumns = columns.map(c => `${driver.quoteColumn(c.name)}`).join(', ')
        let sqlParams = columns.map((c) => `$${c.name}`).join(', ')
        let sql = `INSERT INTO ${driver.quoteTable(meta.tableName)} (${sqlColumns}) VALUES (${sqlParams})`
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
        const setSql = setColumns.map(c => `${driver.quoteColumn(c.name)}=$${c.name}`).join(', ')
        const whereSql = whereColumns.map(c => `${driver.quoteColumn(c.name)} = $${c.name}`).join(' AND ')
        let sql = `UPDATE ${driver.quoteTable(meta.tableName)} SET ${setSql}`
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
        let whereSql = whereColumns.map(c => `${driver.quoteColumn(c.name)} = $${c.name}`).join(' AND ')
        if (options?.where) {
            let sql = whereSql ? ' AND ' : ' WHERE '
            const where = Array.isArray(options.where) ? options.where : [options.where]
            whereSql += sql + where.join(' AND ')
        }
        let sql = `DELETE FROM ${driver.quoteTable(meta.tableName)}`
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

export class ConnectionBase {
    $:ReturnType<typeof Sql.create>
    constructor(public driver:Driver) {
        if (!driver.$) throw new Error(`$ not in Driver: ${driver}`)
        this.$ = driver.$ as ReturnType<typeof Sql.create>
    }
    quote(symbol:string) { return this.driver.quote(symbol) }
    from<Table extends Constructor<any>>(table:Table | TypeRef<InstanceType<Table>>, alias?:string) {
        
        const cls = asType(table)
        const ref = asRef(table) ?? this.$.ref(table, alias ?? '')
        return new SelectQuery(this.driver, [cls], [Schema.assertMeta(cls)], [ref]) 
    }
    updateFor<Table extends Constructor<any>>(table:Table) { 
        return new UpdateQuery(this.driver, [table], [Schema.assertMeta(table)], [this.$.ref(table,'')]) 
    }
    deleteFrom<Table extends Constructor<any>>(table:Table) { 
        return new DeleteQuery(this.driver, [table], [Schema.assertMeta(table)], [this.$.ref(table,'')]) 
    }
}

export class Connection extends ConnectionBase {
    get sync() { 
        if (this.driver.sync == null) {
            throw new Error(`${this.driver.name} does not support sync APIs`)
        }
        return this.driver.sync
    }
    quote(symbol:string) { return this.driver.quote(symbol) }
    
    async insert<T extends ClassInstance>(row:T, options?:InsertOptions) {
        return Promise.resolve(this.sync.insert<T>(row, options))
    }
    async insertAll<T extends ClassInstance>(rows:T[], options?:InsertOptions) {
        return Promise.resolve(this.sync.insertAll<T>(rows, options))
    }
    async listTables() {
        return Promise.resolve(this.sync.listTables())
    }
    async dropTable<Table extends ClassParam>(table:Table) { 
        return Promise.resolve(this.sync.dropTable<Table>(table))
    }
    async createTable<Table extends ClassParam>(table:Table) {
        return Promise.resolve(this.sync.createTable<Table>(table))
    }
    async all<ReturnType>(strings: TemplateStringsArray, ...params: any[]) {
        return Promise.resolve(this.sync.all<ReturnType>(strings, ...params))
    }
    async single<ReturnType>(strings: TemplateStringsArray, ...params: any[]) {
        return Promise.resolve(this.sync.single<ReturnType>(strings, ...params))
    }
}

export class SyncConnection extends ConnectionBase {

    insert<T extends ClassInstance>(row:T, options?:InsertOptions) {
        if (!row) return
        const cls = row.constructor as ReflectMeta
        if (options?.onlyProps || options?.onlyWithValues) {
            const onlyProps = options?.onlyProps ?? propsWithValues(row)
            const onlyOptions = { onlyProps }
            let stmt = this.driver.prepareRaw<T,any>(Schema.insert(cls, this.driver, onlyOptions))
            const dbRow = Schema.toDbObject(row, this.driver, onlyOptions)
            return stmt.exec(dbRow)
        } else {
            let stmt = this.driver.prepareRaw<T,any>(Schema.insert(cls, this.driver))
            const dbRow = Schema.toDbObject(row, this.driver)
            return stmt.exec(dbRow)
        }
    }

    insertAll<T extends ClassInstance>(rows:T[], options?:InsertOptions) {
        if (rows.length == 0)
            return
        const cls = rows[0].constructor as ReflectMeta
        if (options?.onlyProps || options?.onlyWithValues) {
            for (const row of rows) {
                this.insert(row, options)
            }
        } else {
            let last = null
            let stmt = this.driver.prepareRaw<T,any>(Schema.insert(cls, this.driver))
            for (const row of rows) {
                const dbRow = Schema.toDbObject(row, this.driver)
                last = stmt.exec(dbRow)
            }
            return last
        }
    }

    update<T extends ClassInstance>(row:T, options?:UpdateOptions) {
        if (!row) return
        const cls = row.constructor as ReflectMeta
        if (options?.onlyProps || options?.onlyWithValues) {
            const onlyProps = options?.onlyProps ?? propsWithValues(row)
            const onlyOptions = { onlyProps }
            let stmt = this.driver.prepareRaw<T,any>(Schema.update(cls, this.driver, onlyOptions))
            const dbRow = Schema.toDbObject(row, this.driver, onlyOptions)
            return stmt.exec(dbRow)
        } else {
            let stmt = this.driver.prepareRaw<T,any>(Schema.update(cls, this.driver))
            const dbRow = Schema.toDbObject(row, this.driver)
            return stmt.exec(dbRow)
        }
    }

    delete<T extends ClassInstance>(row:T, options?:DeleteOptions) {
        if (!row) return
        const cls = row.constructor as ReflectMeta
        let stmt = this.driver.prepareRaw<T,any>(Schema.delete(cls, this.driver, options))
        const meta = Schema.assertMeta(cls)
        const pkColumns = meta.props.filter(p => p.column?.primaryKey)
        const onlyProps = pkColumns.map(p => p.name)
        const dbRow = Schema.toDbObject(row, this.driver, { onlyProps })
        return stmt.exec(dbRow)
    }

    listTables() { 
        let stmt = this.driver.prepareRaw(this.driver.sqlTableNames())
        const ret = stmt.columnSync()
        return ret
    }

    dropTable<Table extends ClassParam>(table:Table) { 
        let stmt = this.driver.prepareRaw(Schema.dropTable(table, this.driver) )
        return stmt.exec()
    }

    createTable<Table extends ClassParam>(table:Table) {
        let stmt = this.driver.prepareRaw(Schema.createTable(table, this.driver))
        return stmt.exec()
    }

    createStatment<T>(strings: TemplateStringsArray | SqlBuilder, ...params: any[]) 
        : [Statement<T,DbBinding[]>|Statement<T,any>, any[]|Record<string,any>]
    {
        if (typeof strings == "object" && "build" in strings) {
            let query = strings.build()
            let stmt = this.driver.prepareRaw<T,any>(query.sql)
            return [stmt, query.params]
        } else {
            let stmt = this.driver.prepare<T,DbBinding[]>(strings, ...params)
            return [stmt, params]
        }
    }

    all<ReturnType>(strings: TemplateStringsArray | SqlBuilder, ...params: any[]) {
        const [stmt, p] = this.createStatment<ReturnType>(strings, ...params)
        return Array.isArray(p) ? stmt.allSync(...p) : stmt.allSync(p)
    }

    single<ReturnType>(strings: TemplateStringsArray | SqlBuilder, ...params: any[]) {
        const [stmt, p] = this.createStatment<ReturnType>(strings, ...params)
        return Array.isArray(p) ? stmt.firstSync(...p) : stmt.firstSync(p)
    }

    column<ReturnValue>(strings: TemplateStringsArray | SqlBuilder, ...params: any[]) {
        const [stmt, p] = this.createStatment<ReturnValue>(strings, ...params)
        return Array.isArray(p) ? stmt.columnSync(...p) : stmt.columnSync(p)
    }

    scalar<ReturnValue>(strings: TemplateStringsArray | SqlBuilder, ...params: any[]) {
        const [stmt, p] = this.createStatment<ReturnValue>(strings, ...params)
        return Array.isArray(p) ? stmt.scalarSync(...p) : stmt.scalarSync(p)
    }

    exec(sql:string | SqlBuilder, params:Record<string,any>) {
        if (!sql) throw new Error("query is required")
        const query = typeof sql == "object" && "build" in sql
            ? sql.build()
            : { sql, params }
        let stmt = this.driver.prepareRaw(query.sql)
        return stmt.exec(query.params)
    }
}

export class NamingStrategy {
    tableName(table:string) : string { return table }
    columnName(column:string) : string { return column }
    tableFromDef(def:TableDefinition) : string { return def.alias ?? def.name }
}
