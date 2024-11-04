import type { ColumnType, DialectTypes, Driver } from "../types"
import { DataType } from "../model"
import { Sqlite } from "../sqlite/driver"
import { PostgreSqlDialect } from "./dialect"
import { PostgreSqlSchema } from "./schema"
import { ConnectionBase } from "../connection"
import { Schema } from "../schema"

class PostgreSqlTypes implements DialectTypes {
    // use as-is
    native = [
        DataType.INTEGER, DataType.SMALLINT, DataType.BIGINT, // INTEGER
        DataType.REAL, DataType.DOUBLE, DataType.FLOAT, DataType.DECIMAL,  // REAL
        DataType.NUMERIC, DataType.DECIMAL, DataType.MONEY, //NUMERIC 
        DataType.BOOLEAN, 
        DataType.DATE, DataType.DATETIME,
        DataType.TIME, DataType.TIMEZ, DataType.TIMESTAMP, DataType.TIMESTAMPZ, DataType.INTERVAL,
        DataType.UUID, DataType.JSON, DataType.JSONB, DataType.XML, 
        DataType.BLOB, DataType.BYTES, DataType.BIT,
    ]
    // use these types instead
    map : Record<string,ColumnType[]> = {
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
        this.schema = new PostgreSqlSchema(this)
    }
}

export class PostgreSqlConnection extends ConnectionBase {}
