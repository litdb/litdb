import type { 
    DbBinding, ReflectMeta, ClassParam, ClassInstance, TableDefinition, 
    Fragment, SqlBuilder, Statement, SyncStatement, NamingStrategy,
    Driver,
    SyncConnection,
    Connection,
    Dialect,
    IntoFragment,
    Constructor,
    Changes,
} from "./types"
import { Sql } from "./sql"
import { IS, propsWithValues, snakeCase, toStr } from "./utils"
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
}
type DeleteOptions = {
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
        this.schema = this.$.schema = connection.driver.schema
    }

    get sync() { 
        if ((this.driver as any).sync == null) {
            throw new Error(`${this.$.name} does not support sync APIs`)
        }
        return (this.driver as any).sync as SyncDbConnection
    }

    quote(symbol:string) { return this.$.quote(symbol) }
    
    insert<T extends ClassInstance>(row:T, options?:InsertOptions) {
        return Promise.resolve(this.sync.insert<T>(row, options))
    }
    insertAll<T extends ClassInstance>(rows:T[], options?:InsertOptions) {
        return Promise.resolve(this.sync.insertAll<T>(rows, options))
    }
    listTables() {
        return Promise.resolve(this.sync.listTables())
    }
    dropTable<Table extends ClassParam>(table:Table) { 
        return Promise.resolve(this.sync.dropTable<Table>(table))
    }
    createTable<Table extends ClassParam>(table:Table) {
        return Promise.resolve(this.sync.createTable<Table>(table))
    }
    all<ReturnType>(strings: TemplateStringsArray, ...params: any[]) {
        return Promise.resolve(this.sync.all<ReturnType>(strings, ...params))
    }
    one<ReturnType>(strings: TemplateStringsArray, ...params: any[]) {
        return Promise.resolve(this.sync.one<ReturnType>(strings, ...params))
    }
    column<ReturnValue>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        return Promise.resolve(this.sync.column<ReturnValue>(strings, ...params))
    }
    value<ReturnValue>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        return Promise.resolve(this.sync.value<ReturnValue>(strings, ...params))
    }
    arrays(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        return Promise.resolve(this.sync.arrays(strings, ...params))
    }
    array(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        return Promise.resolve(this.sync.array(strings, ...params))
    }
    exec(strings:TemplateStringsArray | SqlBuilder | Fragment, ...params:any[]) {
        return Promise.resolve(this.sync.exec(strings, ...params))
    }
    run(strings:TemplateStringsArray | SqlBuilder | Fragment, ...params:any[]) {
        return Promise.resolve(this.sync.run(strings, ...params))
    }

    prepare<T>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) 
        : [Statement<T,DbBinding[]>|Statement<T,any>, any[]|Record<string,any>]
    {
        if (IS.tpl(strings)) {
            let stmt = this.connection.prepare<T,DbBinding[]>(strings, ...params)
            return [stmt, params]
        } else if (IS.str(strings)) {
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
        this.schema = this.$.schema = connection.driver.schema
    }

    quote(symbol:string) { return this.$.quote(symbol) }

    insert<T extends ClassInstance>(row:T, options?:InsertOptions) {
        const ret:Changes = { changes:0, lastInsertRowid:0 } 
        if (!row) return ret
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
        const ret:Changes = { changes:0, lastInsertRowid:0 } 
        if (rows.length == 0)
            return ret
        const cls = rows[0].constructor as ReflectMeta
        if (options?.onlyProps || options?.onlyWithValues) {
            for (const row of rows) {
                const last = this.insert(row, options)
                ret.changes += last.changes
                ret.lastInsertRowid = last.lastInsertRowid
            }
        } else {
            let last = null
            let stmt = this.connection.prepareSync<T,any>(this.schema.insert(cls))
            for (const row of rows) {
                const dbRow = this.schema.toDbObject(row)
                last = stmt.execSync(dbRow)
                ret.changes += last.changes
                ret.lastInsertRowid = last.lastInsertRowid
            }
        }
        return ret
    }

    update<T extends ClassInstance>(row:T, options?:UpdateOptions) {
        const ret:Changes = { changes:0, lastInsertRowid:0 } 
        if (!row)
            return ret
        const cls = row.constructor as ReflectMeta
        if (options?.onlyProps || options?.onlyWithValues) {
            const pkNames = cls.$props.filter(x => x.column?.primaryKey).map(x => x.column!.name)
            const onlyProps = Array.from(new Set([...(options?.onlyProps ?? propsWithValues(row)), ...pkNames ]))
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
        const ret:Changes = { changes:0, lastInsertRowid:0 } 
        if (!row)
            return ret
        const cls = row.constructor as ReflectMeta
        let stmt = this.connection.prepareSync<T,any>(this.schema.delete(cls, options))
        const meta = Meta.assert(cls)
        const pkColumns = meta.props.filter(p => p.column?.primaryKey)
        const onlyProps = pkColumns.map(p => p.name)
        const dbRow = this.schema.toDbObject(row, { onlyProps })
        return stmt.execSync(dbRow)
    }

    listTables() { 
        return this.column<string>({ sql: this.schema.sqlTableNames(), params:{} })
    }

    dropTable<Table extends ClassParam>(table:Table) { 
        let stmt = this.connection.prepareSync(this.schema.dropTable(table) )
        return stmt.execSync()
    }

    createTable<Table extends ClassParam>(table:Table) {
        let stmt = this.connection.prepareSync(this.schema.createTable(table))
        return stmt.execSync()
    }

    prepareSync<T>(str: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) 
        : [SyncStatement<T,DbBinding[]>|SyncStatement<T,any>, any[]|Record<string,any>, T|undefined]
    {
        if (IS.tpl(str)) {
            let stmt = this.connection.prepareSync<T,DbBinding[]>(str, ...params)
            // console.log('tpl', stmt, strings, params)
            return [stmt, params, undefined]
        } else if (IS.obj(str)) {
            if ("build" in str) {
                let query = str.build()
                let stmt = this.connection.prepareSync<T,any>(query.sql)
                // console.log('build', stmt, query.params)
                return [stmt, query.params ?? {}, (query as any).into as T]
            } else if ("sql" in str) {
                let sql = str.sql
                let params = (str as any).params ?? {}
                let stmt = this.connection.prepareSync<T,any>(sql)
                return [stmt, params, (str as any).into as T]
            }
        }
        throw new Error(`Invalid argument: ${toStr(str)}`)
    }

    all<ReturnType>(strings: TemplateStringsArray | SqlBuilder | Fragment | IntoFragment<ReturnType>, ...params: any[]) {
        const [stmt, p, into] = this.prepareSync<ReturnType>(strings, ...params)
        if (into) {
            const use = stmt.as(into as Constructor<ReturnType>)
            return (Array.isArray(p) ? use.allSync(...p) : use.allSync(p)) as ReturnType[]
        } else {
            return Array.isArray(p) ? stmt.allSync(...p) : stmt.allSync(p)
        }
    }

    one<ReturnType>(strings: TemplateStringsArray | SqlBuilder | Fragment | IntoFragment<ReturnType>, ...params: any[]) {
        const [stmt, p, into] = this.prepareSync<ReturnType>(strings, ...params)
        if (into) {
            const use = stmt.as(into as Constructor<ReturnType>)
            return (Array.isArray(p) ? use.oneSync(...p) : use.oneSync(p)) as ReturnType
        } else {
            return Array.isArray(p) ? stmt.oneSync(...p) : stmt.oneSync(p)
        }
    }

    column<ReturnValue>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        const [stmt, p] = this.prepareSync<ReturnValue>(strings, ...params)
        return Array.isArray(p) 
            ? stmt.arraysSync(...p).map(x => x[0] as ReturnValue) 
            : stmt.arraysSync(p).map(x => x[0] as ReturnValue) 
    }

    value<ReturnValue>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        const [stmt, p, into] = this.prepareSync<ReturnValue>(strings, ...params)
        const value = Array.isArray(p) ? stmt.valueSync(...p) : stmt.valueSync(p)
        if (into) {
            if (into as any === Boolean) {
                return !!value
            }
        }
        return value
    }

    arrays(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        const [stmt, p] = this.prepareSync(strings, ...params)
        return Array.isArray(p) 
            ? stmt.arraysSync(...p)
            : stmt.arraysSync(p)
    }

    array(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        const [stmt, p] = this.prepareSync(strings, ...params)
        return Array.isArray(p) 
            ? stmt.arraySync(...p)
            : stmt.arraySync(p)
    }

    exec(strings:TemplateStringsArray | SqlBuilder | Fragment, ...params:any[]) {
        const [stmt, p] = this.prepareSync(strings, ...params)
        return Array.isArray(p) ? stmt.execSync(...p) : stmt.execSync(p)
    }

    run(strings:TemplateStringsArray | SqlBuilder | Fragment, ...params:any[]) {
        const [stmt, p] = this.prepareSync(strings, ...params)
        if (Array.isArray(p)) {
            stmt.runSync(...p)
        } else {
            stmt.runSync(p)
        }
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
        this.schema = this.$.schema = driver.schema
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

class FilterConnection implements SyncConnection {
    $:ReturnType<typeof Sql.create>
    orig:SyncConnection & { $:ReturnType<typeof Sql.create> }

    constructor(public db:SyncDbConnection, 
        public fn:(sql: TemplateStringsArray | string, params: DbBinding[]) => void) {
        this.orig = db.connection
        db.connection = this
        this.$ = db.$
    }

    get driver() { return this.db.driver }
    
    prepareSync<ReturnType, ParamsType extends DbBinding[]>(sql: TemplateStringsArray | string, ...params: DbBinding[])
        : SyncStatement<ReturnType, ParamsType extends any[] ? ParamsType : [ParamsType]> {
        this.fn(sql, params)
        return this.orig.prepareSync(sql, ...params)
    }

    release() {
        this.db.connection = this.orig
    }
}

export function useFilter(
    db:SyncDbConnection, filter:(sql: TemplateStringsArray | string, params: DbBinding[]) => void) 
    : { release:() => void } {
    return new FilterConnection(db, filter)
}
