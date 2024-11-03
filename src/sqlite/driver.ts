import type { 
    ColumnDefinition, DbBinding, Driver, Fragment, NamingStrategy, Statement, SyncStatement, 
    TableDefinition, TypeConverter, DialectTypes, ColumnType,
    Dialect,
} from "../types"
import { Connection, DefaultNamingStrategy, SyncConnection, DriverRequired } from "../connection"
import { converterFor, DateTimeConverter } from "../converters"
import { DataType, DefaultValues } from "../model"
import { Sql } from "../sql"
import { SqliteDialect } from "./dialect"

export class SqliteTypes implements DialectTypes {
    // use as-is
    native = [
        DataType.INTEGER, DataType.SMALLINT, DataType.BIGINT, // INTEGER
        DataType.REAL, DataType.DOUBLE, DataType.FLOAT,  // REAL
        DataType.NUMERIC, DataType.DECIMAL, DataType.BOOLEAN, DataType.DATE, DataType.DATETIME, //NUMERIC
    ]
    // use these types instead
    map: Record<string,ColumnType[]> = {
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

export class Sqlite implements Driver
{
    static driver = new Sqlite()
    static init() {
        Sqlite.driver = new Sqlite()
        return Sqlite.driver
    }

    async: Connection
    sync: SyncConnection
    name: string
    dialect:Dialect
    $:ReturnType<typeof Sql.create>
    strategy:NamingStrategy = new DefaultNamingStrategy()
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
        this.async = new Connection(this, this.$)
        this.sync = new SyncConnection(this, this.$)
        this.types = new SqliteTypes()
    }

    sqlTableNames(): string {
        return "SELECT name FROM sqlite_master WHERE type ='table' AND name NOT LIKE 'sqlite_%'"
    }

    sqlIndexDefinition(table: TableDefinition, column: ColumnDefinition): string {
        const unique = column.unique ? 'UNIQUE INDEX' : 'INDEX'
        return `CREATE ${unique} idx_${table.name}_${column.name} ON ${this.dialect.quoteTable(table.name)} (${this.dialect.quoteColumn(column.name)})`
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

        let sb = `${this.dialect.quoteColumn(column.name)} ${type}`
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

    prepare<ReturnType, ParamsType extends DbBinding[]>(sql:TemplateStringsArray|string, ...params: DbBinding[])
        : Statement<ReturnType, ParamsType extends any[] ? ParamsType : [ParamsType]> {
        throw new Error(DriverRequired)
    }
    prepareSync<ReturnType, ParamsType extends DbBinding[]>(sql:TemplateStringsArray|string, ...params: DbBinding[])
        : SyncStatement<ReturnType, ParamsType extends any[] ? ParamsType : [ParamsType]> {
        throw new Error(DriverRequired)
    }
}
