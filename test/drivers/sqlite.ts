import { Database, Statement as BunStatement } from "bun:sqlite"
import type { 
    ColumnDefinition, Driver, Connection, SyncConnection, DbBinding, Statement, TableDefinition, TypeConverter, Fragment, SyncStatement, Dialect,
    Changes,     
} from "../../src"
import { 
    Sql, DbConnection, NamingStrategy, SyncDbConnection, DataType, DefaultValues, converterFor, DateTimeConverter, 
    DialectTypes, SqliteDialect, DefaultStrategy, Schema, isTemplateStrings,
    SqliteSchema,
} from "../../src"
import { Constructor } from "../../src/types"

const ENABLE_WAL = "PRAGMA journal_mode = WAL;"

type ConnectionOptions = {
    /**
     * Whether to enable WAL
     * @default "app.db"
     */
    fileName?:string
    /**
     * Whether to enable WAL
     * @default true
     */
    wal?:boolean
    /**
     * Open the database as read-only (no write operations, no create).
     */
    readonly?: boolean
    /**
     * Allow creating a new database
     */
    create?: boolean;
    /**
     * Open the database as read-write
     */
    readwrite?: boolean;
    /**
     * When set to `true`, integers are returned as `bigint` types.
     * When set to `false`, integers are returned as `number` types and truncated to 52 bits.
     * @default false
     */
    safeIntegers?: boolean;
    /**
     * When set to `false` or `undefined`:
     * - Queries missing bound parameters will NOT throw an error
     * - Bound named parameters in JavaScript need to exactly match the SQL query.
     * @default true
     */
    strict?: boolean;
}

/**
 * Create a bun:sqlite SqliteDriver with the specified connection options
 */
export function connect(options?:ConnectionOptions|string) {
    if (typeof options == 'string') {
        const db = new Database(options, { 
            strict: true 
        })
        db.exec(ENABLE_WAL)
        return new SqliteConnection(db, new Sqlite())
    }

    options = options || {}
    if (options.strict !== false) options.strict = true
    if (options.wal !== false) options.wal = true 
    
    const db = new Database(options.fileName ?? "app.db", options)
    if (options?.wal === false) {
        db.exec(ENABLE_WAL)
    }
    return new SqliteConnection(db, new Sqlite())
}

class SqliteStatement<ReturnType, ParamsType extends DbBinding[]>
    implements Statement<ReturnType, ParamsType>, SyncStatement<ReturnType, ParamsType>
{
    native: BunStatement<ReturnType, ParamsType>
    constructor(statement: BunStatement<ReturnType, ParamsType>) {
        this.native = statement
    }

    as<T extends Constructor<any>>(t:T) {
        return new SqliteStatement(this.native.as(t))
    }

    all(...params: ParamsType): Promise<ReturnType[]> {
        return Promise.resolve(this.native.all(...params))
    }
    allSync(...params: ParamsType): ReturnType[] {
        return this.native.all(...params)
    }
    one(...params: ParamsType): Promise<ReturnType | null> {
        return Promise.resolve(this.native.get(...params))
    }
    oneSync(...params: ParamsType): ReturnType | null {
        return this.native.get(...params)
    }

    column<ReturnValue>(...params: ParamsType): Promise<ReturnValue[]> {
        return Promise.resolve(this.native.values(...params).map(row => row[0] as ReturnValue))
    }
    columnSync<ReturnValue>(...params: ParamsType): ReturnValue[] {
        return this.native.values(...params).map(row => row[0] as ReturnValue)
    }

    value<ReturnValue>(...params: ParamsType): Promise<ReturnValue | null> {
        return Promise.resolve(this.native.values(...params).map(row => row[0] as ReturnValue)?.[0] ?? null)
    }
    valueSync<ReturnValue>(...params: ParamsType): ReturnValue | null {
        return this.native.values(...params).map(row => row[0] as ReturnValue)?.[0] ?? null
    }

    arrays(...params: ParamsType): Promise<any[][]> {
        return Promise.resolve(this.native.values(...params))
    }
    arraysSync(...params: ParamsType): any[][] {
        return this.native.values(...params)
    }
    array(...params: ParamsType): Promise<any[] | null> {
        return Promise.resolve(this.native.values(...params)?.[0] ?? null)
    }
    arraySync(...params: ParamsType): any[] | null {
        return this.native.values(...params)?.[0] ?? null
    }

    exec(...params: ParamsType): Promise<Changes> {
        //console.log('params',params)
        return Promise.resolve(this.native.run(...params))
    }
    execSync(...params: ParamsType): Changes {
        //console.log('params',params)
        const ret = this.native.run(...params)
        console.log('ret',ret)
        return ret
    }

    run(...params: ParamsType): Promise<void> {
        return Promise.resolve(this.native.run(...params)).then(x => undefined)
    }
    runSync(...params: ParamsType):void {
        this.native.run(...params)
    }
}

export class SqliteTypes implements DialectTypes {
    // use as-is
    native = [
        DataType.INTEGER, DataType.SMALLINT, DataType.BIGINT, // INTEGER
        DataType.REAL, DataType.DOUBLE, DataType.FLOAT,  // REAL
        DataType.NUMERIC, DataType.DECIMAL, DataType.BOOLEAN, DataType.DATE, DataType.DATETIME, //NUMERIC
    ]
    // use these types instead
    map: Record<string,DataType[]> = {
        INTEGER: [DataType.INTERVAL],
        REAL:    [DataType.REAL],
        NUMERIC: [DataType.DECIMAL, DataType.NUMERIC, DataType.MONEY],
        BLOB:    [DataType.BLOB, DataType.BYTES, DataType.BIT],
        TEXT: [
            DataType.UUID, DataType.JSON, DataType.JSONB, DataType.XML, 
            DataType.TIME, DataType.TIMEZ, DataType.TIMESTAMP, DataType.TIMESTAMPZ,
        ],
    }
}

class Sqlite implements Driver
{
    name: string
    dialect:Dialect
    schema:Schema
    $:ReturnType<typeof Sql.create>
    strategy:NamingStrategy = new DefaultStrategy()
    variables: { [key: string]: string } = {
        [DefaultValues.NOW]: 'CURRENT_TIMESTAMP',
        [DefaultValues.MAX_TEXT]: 'TEXT',
        [DefaultValues.MAX_TEXT_UNICODE]: 'TEXT',
        [DefaultValues.TRUE]: '1',
        [DefaultValues.FALSE]: '0',
    }
    types: DialectTypes

    converters: { [key: string]: TypeConverter } = {
        ...converterFor(DateTimeConverter.instance, DataType.DATE, DataType.DATETIME, DataType.TIMESTAMP, DataType.TIMESTAMPZ),
    }

    constructor() {
        this.dialect = new SqliteDialect()
        this.$ = this.dialect.$
        this.name = this.constructor.name
        this.schema = new SqliteSchema(this)
        this.types = new SqliteTypes()
    }

    quote(name: string): string { return `"${name}"` }
    
    quoteTable(name: string): string { return this.quote(this.strategy.tableName(name)) }

    quoteColumn(name: string): string { return this.quote(this.strategy.columnName(name)) }

    sqlTableNames(): string {
        return "SELECT name FROM sqlite_master WHERE type ='table' AND name NOT LIKE 'sqlite_%'"
    }

    sqlIndexDefinition(table: TableDefinition, column: ColumnDefinition): string {
        const unique = column.unique ? 'UNIQUE INDEX' : 'INDEX'
        return `CREATE ${unique} idx_${table.name}_${column.name} ON ${this.quoteTable(table.name)} (${this.quoteColumn(column.name)})`
    }

    sqlColumnDefinition(column: ColumnDefinition): string {
        let dataType = column.type as DataType
        let type = this.types.native.includes(dataType) ? dataType : undefined
        if (!type) {
            for (const [sqliteType, typeMapping] of Object.entries(this.types.map)) {
                if (typeMapping.includes(dataType)) {
                    type = sqliteType as DataType
                    break
                }
            }
        }
        if (!type) type = dataType

        let sb = `${this.quoteColumn(column.name)} ${type}`
        if (column.primaryKey) {
            sb += ' PRIMARY KEY'
        }
        if (column.autoIncrement) {
            sb += ' AUTOINCREMENT'
        }
        if (column.required) {
            sb += ' NOT NULL'
        }
        if (column.unique && !column.index) {
            sb += ' UNIQUE'
        }
        if (column.defaultValue) {
            const val = this.variables[column.defaultValue] ?? column.defaultValue
            sb += ` DEFAULT ${val}`
        }
        return sb
    }

    sqlLimit(offset?: number, limit?: number): Fragment {
        if (offset == null && limit == null)
            throw new Error(`Invalid argument sqlLimit(${offset}, ${limit})`)
        const frag = offset
            ? this.$.fragment(`LIMIT $limit OFFSET $offset`, { offset, limit:limit ?? -1 })
            : this.$.fragment(`LIMIT $limit`, { limit })
        return frag
    }
}

class SqliteConnection implements Connection, SyncConnection {
    $:ReturnType<typeof Sql.create>
    async: DbConnection
    sync: SyncDbConnection
    schema: Schema
    dialect: Dialect

    constructor(public db:Database, public driver:Driver & {
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
        if (isTemplateStrings(sql)) {
            let sb = ''
            for (let i = 0; i < sql.length; i++) {
                sb += sql[i]
                if (i < params.length) {
                    sb += `?${i+1}`
                }
            }
            return new SqliteStatement(this.db.query<ReturnType, ParamsType>(sb))
        } else {
            return new SqliteStatement(this.db.query<ReturnType, ParamsType>(sql))
        }
    }

    prepareSync<ReturnType, ParamsType extends DbBinding[]>(sql:TemplateStringsArray|string, ...params: DbBinding[])
        : SyncStatement<ReturnType, ParamsType extends any[] ? ParamsType : [ParamsType]> {
        if (isTemplateStrings(sql)) {
            let sb = ''
            for (let i = 0; i < sql.length; i++) {
                sb += sql[i]
                if (i < params.length) {
                    sb += `?${i+1}`
                }
            }
            return new SqliteStatement(this.db.query<ReturnType, ParamsType>(sb))
        } else {
            return new SqliteStatement(this.db.query<ReturnType, ParamsType>(sql))
        }
    }
}
