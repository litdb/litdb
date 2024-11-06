import type { Driver, NamingStrategy, TypeConverter, DialectTypes, ColumnType, Dialect } from "../types"
import { ConnectionBase, DefaultStrategy } from "../connection"
import { converterFor, DateTimeConverter } from "../converters"
import { DataType, DefaultValues } from "../model"
import { Sql } from "../sql"
import { SqliteDialect } from "./dialect"
import { Schema } from "../schema"
import { SqliteSchema } from "./schema"

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
    static connection:ConnectionBase
    static driver:Driver
    static schema:Schema
    static init() { 
        const c = Sqlite.connection = new SqliteConnection(new Sqlite())
        const { driver, schema } = c
        Object.assign(Sqlite, { driver, schema })
        return c
    }

    name: string
    dialect:Dialect
    schema:Schema
    strategy:NamingStrategy = new DefaultStrategy()
    $:ReturnType<typeof Sql.create>
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
        this.name = this.constructor.name
        this.dialect = new SqliteDialect()
        this.$ = this.dialect.$
        this.types = new SqliteTypes()
        this.schema = this.$.schema = new SqliteSchema(this)
    }
}

export class SqliteConnection extends ConnectionBase {}