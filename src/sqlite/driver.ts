import type { Driver, NamingStrategy, TypeConverter, DialectTypes, ColumnType, Dialect } from "../types"
import { ConnectionBase, DefaultStrategy } from "../connection"
import { converterFor, DateTimeConverter } from "../converters"
import { DefaultValues } from "../model"
import { Sql } from "../sql"
import { SqliteDialect } from "./dialect"
import { Schema } from "../schema"
import { SqliteSchema } from "./schema"

export class SqliteTypes implements DialectTypes {
    // use as-is
    native:ColumnType[] = [
        "INTEGER", "SMALLINT", "BIGINT", // INTEGER
        "REAL", "DOUBLE", "FLOAT",       // REAL
        "NUMERIC", "DECIMAL", "BOOLEAN", // NUMERIC
        "DATE", "DATETIME",
    ]
    // use these types instead
    map: Record<string,ColumnType[]> = {
        INTEGER: ["INTERVAL", "MONEY"],
        BLOB:    ["BLOB", "BYTES", "BIT"],
        TEXT: [
            "UUID", "JSON", "JSONB", "XML", 
            "TIME", "TIMEZ", "TIMESTAMP", "TIMESTAMPZ",
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
        ...converterFor(new DateTimeConverter, "DATE", "DATETIME", "TIMESTAMP", "TIMESTAMPZ"),
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