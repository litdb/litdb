import type { ColumnType, DialectTypes, Driver } from "../types"
import { Sqlite } from "../sqlite/driver"
import { PostgreSqlDialect } from "./dialect"
import { PostgreSqlSchema } from "./schema"
import { ConnectionBase } from "../connection"
import { Schema } from "../schema"


export class PostgreSqlTypes implements DialectTypes {
    // use as-is
    native:ColumnType[] = [
        "INTEGER", "SMALLINT", "BIGINT", // INTEGER
        "REAL", "DOUBLE", "FLOAT", "DECIMAL",  // REAL
        "NUMERIC", "DECIMAL", "MONEY", //NUMERIC 
        "BOOLEAN", 
        "DATE", 
        "TIME", "TIMEZ", "TIMESTAMP", "TIMESTAMPZ", "INTERVAL",
        "UUID", "JSON", "JSONB", "XML", 
        "BLOB", "BYTES", "BIT",
    ]
    // use these types instead
    map: Record<string,ColumnType[]> = {
        "TIMESTAMPTZ": ["DATETIME"],
    }
}

export class PostgreSql extends Sqlite
{
    static connection:ConnectionBase
    static driver:Driver
    static schema:Schema
    static init() { 
        const c = PostgreSql.connection = new PostgreSqlConnection(new PostgreSql())
        const { driver, schema } = c
        Object.assign(PostgreSql, { driver, schema })
        return c
    }

    constructor() {
        super()
        this.dialect = new PostgreSqlDialect()
        this.$ = this.dialect.$
        this.types = new PostgreSqlTypes()
        this.schema = this.$.schema = new PostgreSqlSchema(this)
    }
}

export class PostgreSqlConnection extends ConnectionBase {}
