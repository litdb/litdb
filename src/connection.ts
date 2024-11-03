import type { 
    Driver, DbBinding, ReflectMeta, ClassParam, ClassInstance, TableDefinition, 
    Fragment, SqlBuilder, Statement,
    SyncStatement,
} from "./types"
import { Sql } from "./sql"
import { propsWithValues } from "./utils"
import { Schema } from "./schema"

export const DriverRequired = `Driver Implementation required, see: https://github.com/litdb/litdb`

export const DriverRequiredProxy = new Proxy({}, {
    get:(target: {}, key:string|symbol) => {
        throw new Error(DriverRequired)
    }
})

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

export class ConnectionBase {
    constructor(public driver:Driver, public $:ReturnType<typeof Sql.create>) {}
    quote(symbol:string) { return this.$.quote(symbol) }
}

export class Connection extends ConnectionBase {
    get sync() { 
        if (this.driver.sync == null) {
            throw new Error(`${this.$.name} does not support sync APIs`)
        }
        return this.driver.sync
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
}

export class SyncConnection extends ConnectionBase {

    insert<T extends ClassInstance>(row:T, options?:InsertOptions) {
        if (!row) return
        const cls = row.constructor as ReflectMeta
        if (options?.onlyProps || options?.onlyWithValues) {
            const onlyProps = options?.onlyProps ?? propsWithValues(row)
            const onlyOptions = { onlyProps }
            let stmt = this.driver.prepare<T,any>(Schema.insert(cls, this.driver, onlyOptions))
            const dbRow = Schema.toDbObject(row, this.driver, onlyOptions)
            return stmt.exec(dbRow)
        } else {
            let stmt = this.driver.prepare<T,any>(Schema.insert(cls, this.driver))
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
            let stmt = this.driver.prepare<T,any>(Schema.insert(cls, this.driver))
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
            let stmt = this.driver.prepare<T,any>(Schema.update(cls, this.driver, onlyOptions))
            const dbRow = Schema.toDbObject(row, this.driver, onlyOptions)
            return stmt.exec(dbRow)
        } else {
            let stmt = this.driver.prepare<T,any>(Schema.update(cls, this.driver))
            const dbRow = Schema.toDbObject(row, this.driver)
            return stmt.exec(dbRow)
        }
    }

    delete<T extends ClassInstance>(row:T, options?:DeleteOptions) {
        if (!row) return
        const cls = row.constructor as ReflectMeta
        let stmt = this.driver.prepare<T,any>(Schema.delete(cls, this.driver, options))
        const meta = Schema.assertMeta(cls)
        const pkColumns = meta.props.filter(p => p.column?.primaryKey)
        const onlyProps = pkColumns.map(p => p.name)
        const dbRow = Schema.toDbObject(row, this.driver, { onlyProps })
        return stmt.exec(dbRow)
    }

    listTables() { 
        let stmt = this.driver.prepareSync(this.driver.sqlTableNames())
        const ret = stmt.arraysSync().map(x => x[0] as string)
        return ret
    }

    dropTable<Table extends ClassParam>(table:Table) { 
        let stmt = this.driver.prepareSync(Schema.dropTable(table, this.driver) )
        return stmt.execSync()
    }

    createTable<Table extends ClassParam>(table:Table) {
        let stmt = this.driver.prepareSync(Schema.createTable(table, this.driver))
        return stmt.execSync()
    }

    statment<T>(strings: TemplateStringsArray | SqlBuilder, ...params: any[]) 
        : [Statement<T,DbBinding[]>|Statement<T,any>, any[]|Record<string,any>]
    {
        if (typeof strings == "object" && "build" in strings) {
            let query = strings.build()
            let stmt = this.driver.prepare<T,any>(query.sql)
            return [stmt, query.params]
        } else {
            let stmt = this.driver.prepare<T,DbBinding[]>(strings, ...params)
            return [stmt, params]
        }
    }
    statmentSync<T>(strings: TemplateStringsArray | SqlBuilder, ...params: any[]) 
        : [SyncStatement<T,DbBinding[]>|SyncStatement<T,any>, any[]|Record<string,any>]
    {
        if (typeof strings == "object" && "build" in strings) {
            let query = strings.build()
            let stmt = this.driver.prepareSync<T,any>(query.sql)
            return [stmt, query.params]
        } else {
            let stmt = this.driver.prepareSync<T,DbBinding[]>(strings, ...params)
            return [stmt, params]
        }
    }

    all<ReturnType>(strings: TemplateStringsArray | SqlBuilder, ...params: any[]) {
        const [stmt, p] = this.statmentSync<ReturnType>(strings, ...params)
        return Array.isArray(p) ? stmt.allSync(...p) : stmt.allSync(p)
    }

    one<ReturnType>(strings: TemplateStringsArray | SqlBuilder, ...params: any[]) {
        const [stmt, p] = this.statmentSync<ReturnType>(strings, ...params)
        return Array.isArray(p) ? stmt.oneSync(...p) : stmt.oneSync(p)
    }

    column<ReturnValue>(strings: TemplateStringsArray | SqlBuilder, ...params: any[]) {
        const [stmt, p] = this.statmentSync<ReturnValue>(strings, ...params)
        return Array.isArray(p) ? stmt.arraysSync(...p).map(x => x[0] as ReturnValue) : stmt.arraysSync(p)[0] as ReturnValue
    }

    value<ReturnValue>(strings: TemplateStringsArray | SqlBuilder, ...params: any[]) {
        const [stmt, p] = this.statmentSync<ReturnValue>(strings, ...params)
        return Array.isArray(p) ? stmt.valueSync(...p) : stmt.valueSync(p)
    }

    exec(sql:string | SqlBuilder, params:Record<string,any>) {
        if (!sql) throw new Error("query is required")
        const query = typeof sql == "object" && "build" in sql
            ? sql.build()
            : { sql, params }
        let stmt = this.driver.prepareSync(query.sql)
        return stmt.execSync(query.params)
    }
}

export class DefaultNamingStrategy {
    tableName(table:string) : string { return table }
    columnName(column:string) : string { return column }
    tableFromDef(def:TableDefinition) : string { return def.alias ?? def.name }
}
