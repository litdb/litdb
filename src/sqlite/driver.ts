import type { Driver, NamingStrategy, DialectTypes, ColumnType, Dialect } from "../types"
import { ConnectionBase, DefaultStrategy } from "../connection"
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

    constructor() {
        this.name = this.constructor.name
        this.dialect = new SqliteDialect()
        this.$ = this.dialect.$
        this.schema = this.$.schema = new SqliteSchema(this, this.$, new SqliteTypes())
    }
}

export class SqliteConnection extends ConnectionBase {}