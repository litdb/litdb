import type { 
    DbBinding, ReflectMeta, ClassParam, ClassInstance, TableDefinition, 
    Fragment, SqlBuilder, Statement, SyncStatement, NamingStrategy,
    Driver,
    SyncConnection,
    Connection,
    Dialect,
} from "./types"
import { Sql } from "./sql"
import { isTemplateStrings, propsWithValues, snakeCase, toStr } from "./utils"
import { Meta } from "./meta"
import { Schema, DriverRequired } from "./schema"

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

export class DbConnection {
    driver:Driver
    $:ReturnType<typeof Sql.create>
    schema:Schema

    constructor(public connection:Connection & {
        $:ReturnType<typeof Sql.create>
    }) {
        this.$ = connection.$
        this.driver = connection.driver
        this.schema = connection.driver.schema
    }

    get sync() { 
        if ((this.driver as any).sync == null) {
            throw new Error(`${this.$.name} does not support sync APIs`)
        }
        return (this.driver as any).sync as SyncDbConnection
    }

    quote(symbol:string) { return this.$.quote(symbol) }
    
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
    async one<ReturnType>(strings: TemplateStringsArray, ...params: any[]) {
        return Promise.resolve(this.sync.one<ReturnType>(strings, ...params))
    }

    prepare<T>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) 
        : [Statement<T,DbBinding[]>|Statement<T,any>, any[]|Record<string,any>]
    {
        if (isTemplateStrings(strings)) {
            let stmt = this.connection.prepare<T,DbBinding[]>(strings, ...params)
            return [stmt, params]
        } else if (typeof strings == "object") {
            if ("build" in strings) {
                let query = strings.build()
                let stmt = this.connection.prepare<T,any>(query.sql)
                return [stmt, query.params]
            } else if ("sql" in strings) {
                let stmt = this.connection.prepare<T,any>(strings.sql)
                return [stmt, (strings as any).params ?? {}]
            }
        }
        throw new Error(`Invalid argument: ${toStr(strings)}`)
    }    
}

export class SyncDbConnection {
    driver:Driver
    $:ReturnType<typeof Sql.create>
    schema:Schema

    constructor(public connection:SyncConnection & {
        $:ReturnType<typeof Sql.create>
    }) {
        this.$ = connection.$
        this.driver = connection.driver
        this.schema = connection.driver.schema
    }

    quote(symbol:string) { return this.$.quote(symbol) }

    insert<T extends ClassInstance>(row:T, options?:InsertOptions) {
        if (!row) return
        const cls = row.constructor as ReflectMeta
        if (options?.onlyProps || options?.onlyWithValues) {
            const onlyProps = options?.onlyProps ?? propsWithValues(row)
            const onlyOptions = { onlyProps }
            let stmt = this.connection.prepareSync<T,any>(this.schema.insert(cls, onlyOptions))
            const dbRow = this.schema.toDbObject(row, onlyOptions)
            return stmt.execSync(dbRow)
        } else {
            let stmt = this.connection.prepareSync<T,any>(this.schema.insert(cls))
            const dbRow = this.schema.toDbObject(row)
            return stmt.execSync(dbRow)
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
            let stmt = this.connection.prepareSync<T,any>(this.schema.insert(cls))
            for (const row of rows) {
                const dbRow = this.schema.toDbObject(row)
                last = stmt.execSync(dbRow)
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
            let stmt = this.connection.prepareSync<T,any>(this.schema.update(cls, onlyOptions))
            const dbRow = this.schema.toDbObject(row, onlyOptions)
            return stmt.execSync(dbRow)
        } else {
            let stmt = this.connection.prepareSync<T,any>(this.schema.update(cls))
            const dbRow = this.schema.toDbObject(row)
            return stmt.execSync(dbRow)
        }
    }

    delete<T extends ClassInstance>(row:T, options?:DeleteOptions) {
        if (!row) return
        const cls = row.constructor as ReflectMeta
        let stmt = this.connection.prepareSync<T,any>(this.schema.delete(cls, options))
        const meta = Meta.assertMeta(cls)
        const pkColumns = meta.props.filter(p => p.column?.primaryKey)
        const onlyProps = pkColumns.map(p => p.name)
        const dbRow = this.schema.toDbObject(row, { onlyProps })
        return stmt.execSync(dbRow)
    }

    listTables() { 
        return this.column<string>({ sql: this.schema.sqlTableNames() })
    }

    dropTable<Table extends ClassParam>(table:Table) { 
        let stmt = this.connection.prepareSync(this.schema.dropTable(table) )
        return stmt.execSync()
    }

    createTable<Table extends ClassParam>(table:Table) {
        let stmt = this.connection.prepareSync(this.schema.createTable(table))
        return stmt.execSync()
    }

    prepareSync<T>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) 
        : [SyncStatement<T,DbBinding[]>|SyncStatement<T,any>, any[]|Record<string,any>]
    {
        if (isTemplateStrings(strings)) {
            let stmt = this.connection.prepareSync<T,DbBinding[]>(strings, ...params)
            return [stmt, params]
        } else if (typeof strings == "object") {
            if ("build" in strings) {
                let query = strings.build()
                let stmt = this.connection.prepareSync<T,any>(query.sql)
                return [stmt, query.params]
            } else if ("sql" in strings) {
                let stmt = this.connection.prepareSync<T,any>(strings.sql)
                return [stmt, (strings as any).params ?? {}]
            }
        }
        throw new Error(`Invalid argument: ${toStr(strings)}`)
    }

    all<ReturnType>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        const [stmt, p] = this.prepareSync<ReturnType>(strings, ...params)
        return Array.isArray(p) ? stmt.allSync(...p) : stmt.allSync(p)
    }

    one<ReturnType>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        const [stmt, p] = this.prepareSync<ReturnType>(strings, ...params)
        return Array.isArray(p) ? stmt.oneSync(...p) : stmt.oneSync(p)
    }

    column<ReturnValue>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        const [stmt, p] = this.prepareSync<ReturnValue>(strings, ...params)
        return Array.isArray(p) 
            ? stmt.arraysSync(...p).map(x => x[0] as ReturnValue) 
            : stmt.arraysSync(p).map(x => x[0] as ReturnValue) 
    }

    value<ReturnValue>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        const [stmt, p] = this.prepareSync<ReturnValue>(strings, ...params)
        return Array.isArray(p) ? stmt.valueSync(...p) : stmt.valueSync(p)
    }

    exec(sql:string | SqlBuilder | Fragment, params:Record<string,any>) {
        if (!sql) throw new Error("query is required")
        const query = typeof sql == "object" 
            ? ("build" in sql 
                ? sql.build()
                : "sql" in sql ? sql : null)
            : { sql, params }
        if (!query?.sql) throw new Error(`Invalid argument: ${toStr(sql)}`)
        let stmt = this.connection.prepareSync(query.sql)
        return stmt.execSync(query.params ?? {})
    }
}

export class ConnectionBase {
    $:ReturnType<typeof Sql.create>
    async: DbConnection
    sync: SyncDbConnection
    schema: Schema
    dialect: Dialect

    constructor(public driver:Driver & {
        $:ReturnType<typeof Sql.create>
    }) {
        this.$ = driver.$
        this.schema = driver.schema
        this.dialect = driver.dialect
        this.async = new DbConnection(this)
        this.sync = new SyncDbConnection(this)
    }

    prepare<ReturnType, ParamsType extends DbBinding[]>(sql:TemplateStringsArray|string, ...params: DbBinding[])
        : Statement<ReturnType, ParamsType extends any[] ? ParamsType : [ParamsType]> {
        throw new Error(DriverRequired)
    }

    prepareSync<ReturnType, ParamsType extends DbBinding[]>(sql:TemplateStringsArray|string, ...params: DbBinding[])
        : SyncStatement<ReturnType, ParamsType extends any[] ? ParamsType : [ParamsType]> {
        throw new Error(DriverRequired)
    }
}

export class DefaultStrategy implements NamingStrategy {
    tableName(table:string) : string { return table }
    columnName(column:string) : string { return column }
    tableFromDef(def:TableDefinition) : string { return def.alias ?? def.name }
}

export class SnakeCaseStrategy implements NamingStrategy {
    tableName(table:string) : string { return snakeCase(table) }
    columnName(column:string) : string { return snakeCase(column) }
    tableFromDef(def:TableDefinition) : string { return snakeCase(def.alias ?? def.name) }
}
