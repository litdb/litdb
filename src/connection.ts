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
    ColumnDefinition,
} from "./types"
import { Sql } from "./sql"
import { IS, isQuoted, propsWithValues, snakeCase, toStr } from "./utils"
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
    update<T extends ClassInstance>(row:T, options?:UpdateOptions) {
        return Promise.resolve(this.sync.update<T>(row, options))
    }
    delete<T extends ClassInstance>(row:T, options?:DeleteOptions) {
        return Promise.resolve(this.sync.delete<T>(row, options))
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
    all<RetType>(strings: TemplateStringsArray | SqlBuilder | Fragment | IntoFragment<RetType>, ...params: any[]) {
        return Promise.resolve(this.sync.all<RetType>(strings, ...params))
    }
    one<RetType>(strings: TemplateStringsArray | SqlBuilder | Fragment | IntoFragment<RetType>, ...params: any[]) {
        return Promise.resolve(this.sync.one<RetType>(strings, ...params))
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

    prepare<T>(str: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) 
        : [Statement<T,DbBinding[]>|Statement<T,any>, any[]|Record<string,any>, T|undefined]
    {
        const C = this.connection
        if (IS.tpl(str)) {
            let stmt = C.prepare<T,DbBinding[]>(str, ...params)
            // console.log('tpl', stmt, strings, params)
            return [stmt, params, undefined]
        } else if (IS.obj(str)) {
            if ("build" in str) {
                let query = str.build()
                let stmt = C.prepare<T,any>(query.sql)
                // console.log('build', stmt, query.params)
                return [stmt, query.params ?? {}, (query as any).into as T]
            } else if ("sql" in str) {
                let sql = str.sql
                let params = (str as any).params ?? {}
                let stmt = C.prepare<T,any>(sql)
                return [stmt, params, (str as any).into as T]
            }
        }
        throw new Error(`Invalid argument: ${toStr(str)}`)
    }
    
    close() {
        return this.connection.close()
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
        const S = this.schema
        if (options?.onlyProps || options?.onlyWithValues) {
            const onlyProps = options?.onlyProps ?? propsWithValues(row)
            const onlyOptions = { onlyProps }
            let stmt = this.connection.prepareSync<T,any>(S.insert(cls, onlyOptions))
            const dbRow = S.toDbObject(row, onlyOptions)
            return stmt.execSync(dbRow)
        } else {
            let stmt = this.connection.prepareSync<T,any>(S.insert(cls))
            const dbRow = S.toDbObject(row)
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
        const S = this.schema
        if (options?.onlyProps || options?.onlyWithValues) {
            const pkNames = cls.$props.filter(x => x.column?.primaryKey).map(x => x.column!.name)
            const onlyProps = Array.from(new Set([...(options?.onlyProps ?? propsWithValues(row)), ...pkNames ]))
            const onlyOptions = { onlyProps }
            let stmt = this.connection.prepareSync<T,any>(S.update(cls, onlyOptions))
            const dbRow = S.toDbObject(row, onlyOptions)
            return stmt.execSync(dbRow)
        } else {
            let stmt = this.connection.prepareSync<T,any>(S.update(cls))
            const dbRow = S.toDbObject(row)
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
        stmt.runSync()
    }

    createTable<Table extends ClassParam>(table:Table) {
        let stmt = this.connection.prepareSync(this.schema.createTable(table))
        stmt.runSync()
    }

    prepareSync<T>(str: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) 
        : [SyncStatement<T,DbBinding[]>|SyncStatement<T,any>, any[]|Record<string,any>, T|undefined]
    {
        const C = this.connection
        if (IS.tpl(str)) {
            let stmt = C.prepareSync<T,DbBinding[]>(str, ...params)
            // console.log('tpl', stmt, strings, params)
            return [stmt, params, undefined]
        } else if (IS.obj(str)) {
            if ("build" in str) {
                let query = str.build()
                let stmt = C.prepareSync<T,any>(query.sql)
                // console.log('build', stmt, query.params)
                return [stmt, query.params ?? {}, (query as any).into as T]
            } else if ("sql" in str) {
                let sql = str.sql
                let params = (str as any).params ?? {}
                let stmt = C.prepareSync<T,any>(sql)
                return [stmt, params, (str as any).into as T]
            }
        }
        throw new Error(`Invalid argument: ${toStr(str)}`)
    }

    all<RetType>(strings: TemplateStringsArray | SqlBuilder | Fragment | IntoFragment<RetType>, ...params: any[]) {
        const [stmt, p, into] = this.prepareSync<RetType>(strings, ...params)
        if (into) {
            const use = stmt.as(into as Constructor<RetType>)
            return (IS.arr(p) ? use.allSync(...p) : use.allSync(p)) as RetType[]
        } else {
            return IS.arr(p) ? stmt.allSync(...p) : stmt.allSync(p)
        }
    }

    one<RetType>(strings: TemplateStringsArray | SqlBuilder | Fragment | IntoFragment<RetType>, ...params: any[]) {
        const [stmt, p, into] = this.prepareSync<RetType>(strings, ...params)
        if (into) {
            const use = stmt.as(into as Constructor<RetType>)
            return (IS.arr(p) ? use.oneSync(...p) : use.oneSync(p)) as RetType
        } else {
            return IS.arr(p) ? stmt.oneSync(...p) : stmt.oneSync(p)
        }
    }

    column<ReturnValue>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        const [stmt, p] = this.prepareSync<ReturnValue>(strings, ...params)
        return IS.arr(p) 
            ? stmt.arraysSync(...p).map(x => x[0] as ReturnValue) 
            : stmt.arraysSync(p).map(x => x[0] as ReturnValue) 
    }

    value<ReturnValue>(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        const [stmt, p, into] = this.prepareSync<ReturnValue>(strings, ...params)
        const value = IS.arr(p) ? stmt.valueSync(...p) : stmt.valueSync(p)
        if (into) {
            if (into as any === Boolean) {
                return !!value
            }
        }
        return value
    }

    arrays(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        const [stmt, p] = this.prepareSync(strings, ...params)
        return IS.arr(p) 
            ? stmt.arraysSync(...p)
            : stmt.arraysSync(p)
    }

    array(strings: TemplateStringsArray | SqlBuilder | Fragment, ...params: any[]) {
        const [stmt, p] = this.prepareSync(strings, ...params)
        return IS.arr(p) 
            ? stmt.arraySync(...p)
            : stmt.arraySync(p)
    }

    exec(strings:TemplateStringsArray | SqlBuilder | Fragment, ...params:any[]) {
        const [stmt, p] = this.prepareSync(strings, ...params)
        return IS.arr(p) ? stmt.execSync(...p) : stmt.execSync(p)
    }

    run(strings:TemplateStringsArray | SqlBuilder | Fragment, ...params:any[]) {
        const [stmt, p] = this.prepareSync(strings, ...params)
        if (IS.arr(p)) {
            stmt.runSync(...p)
        } else {
            stmt.runSync(p)
        }
    }

    close() {
        this.connection.closeSync()
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

    prepare<RetType, ParamsType extends DbBinding[]>(sql:TemplateStringsArray|string, ...params: DbBinding[])
        : Statement<RetType, ParamsType extends any[] ? ParamsType : [ParamsType]> {
        throw new Error(DriverRequired)
    }

    prepareSync<RetType, ParamsType extends DbBinding[]>(sql:TemplateStringsArray|string, ...params: DbBinding[])
        : SyncStatement<RetType, ParamsType extends any[] ? ParamsType : [ParamsType]> {
        throw new Error(DriverRequired)
    }

    close():Promise<void> { throw new Error(DriverRequired) }
    closeSync() { throw new Error(DriverRequired) }
}

export class DefaultStrategy implements NamingStrategy {
    tableName(table:string) : string { return table }
    columnName(column:string) : string { return column }
}

export class SnakeCaseStrategy implements NamingStrategy {
    tableName(table:string) : string { return snakeCase(table) }
    columnName(column:string) : string { return snakeCase(column) }
}

export class DialectBase {
    $:ReturnType<typeof Sql.create>
    strategy:DefaultStrategy = new DefaultStrategy()
    
    constructor() {
        this.$ = Sql.create(this)
    }

    quote(name: string): string { return isQuoted(name) ? name : `"${name}"` }
    
    quoteTable(table: string|TableDefinition): string { 
        return IS.str(table)
            ? isQuoted(table) 
                ? table 
                : this.quote(this.strategy.tableName(table))
            : this.quote(table.alias ?? this.strategy.tableName(table.name))
    }

    quoteColumn(column: string|ColumnDefinition): string { 
        return IS.str(column)
            ? isQuoted(column) 
                ? column 
                : this.quote(this.strategy.columnName(column))
            : this.quote(column.alias ?? this.strategy.columnName(column.name))
    }

    sqlLimit(offset?: number, limit?: number): Fragment {
        if (offset == null && limit == null)
            throw new Error(`Invalid argument sqlLimit(${offset}, ${limit})`)
        const frag = offset
            ? this.$.sql(`LIMIT $limit OFFSET $offset`, { offset, limit:limit ?? -1 })
            : this.$.sql(`LIMIT $limit`, { limit })
        return frag
    }
}

class SyncFilterConn implements SyncConnection {
    $:ReturnType<typeof Sql.create>
    orig:SyncConnection & { $:ReturnType<typeof Sql.create> }

    constructor(public db:SyncDbConnection, 
        public fn:(sql: TemplateStringsArray | string, params: DbBinding[]) => void) {
        this.orig = db.connection
        db.connection = this
        this.$ = db.$
    }

    get driver() { return this.db.driver }
    
    prepareSync<RetType, ParamsType extends DbBinding[]>(sql: TemplateStringsArray | string, ...params: DbBinding[])
        : SyncStatement<RetType, ParamsType extends any[] ? ParamsType : [ParamsType]> {
        this.fn(sql, params)
        return this.orig.prepareSync(sql, ...params)
    }

    release() {
        this.db.connection = this.orig
    }

    closeSync() { this.db.connection.closeSync() }
}
export function useFilterSync(
    db:SyncDbConnection, filter:(sql: TemplateStringsArray | string, params: DbBinding[]) => void) 
    : { release:() => void } {
    return new SyncFilterConn(db, filter)
}

class FilterConn implements Connection {
    $:ReturnType<typeof Sql.create>
    orig:Connection & { $:ReturnType<typeof Sql.create> }

    constructor(public db:DbConnection, 
        public fn:(sql: TemplateStringsArray | string, params: DbBinding[]) => void) {
        this.orig = db.connection
        db.connection = this
        this.$ = db.$
    }

    get driver() { return this.db.driver }
    
    prepare<RetType, ParamsType extends DbBinding[]>(sql: TemplateStringsArray | string, ...params: DbBinding[])
        : Statement<RetType, ParamsType extends any[] ? ParamsType : [ParamsType]> {
        this.fn(sql, params)
        return this.orig.prepare(sql, ...params)
    }

    release() {
        this.db.connection = this.orig
    }

    close() { return this.db.connection.close() }
}
export function useFilter(
    db:DbConnection, filter:(sql: TemplateStringsArray | string, params: DbBinding[]) => void) 
    : { release:() => void } {
    return new FilterConn(db, filter)
}
