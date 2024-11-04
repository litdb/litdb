import type { ColumnType, DialectTypes, Driver } from "../types"
import { DataType } from "../model"
import { Sqlite } from "../sqlite/driver"
import { MySqlDialect } from "./dialect"
import { MySqlSchema } from "./schema"
import { ConnectionBase } from "../connection"
import { Schema } from "../schema"

class MySqlTypes implements DialectTypes {
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
        [DataType.DOUBLE]: [DataType.REAL],
        [DataType.MONEY]: [DataType.DECIMAL],
        [DataType.TIME]: [DataType.TIMEZ],
        [DataType.TIMESTAMP]: [DataType.TIMESTAMPZ],
        [DataType.INTEGER]: [DataType.INTERVAL],
        [DataType.JSON]: [DataType.JSONB],
        [DataType.TEXT]: [DataType.XML],
        "BINARY": [DataType.BYTES],
        "BINARY(1)": [DataType.BIT],
    }
}

export class MySql extends Sqlite
{
    static connection:ConnectionBase
    static driver:Driver
    static schema:Schema
    static init() { 
        const c = MySql.connection = new MySqlConnection(new MySql())
        const { driver, schema } = c
        Object.assign(MySql, { driver, schema })
        return c
    }

    constructor() {
        super()
        this.dialect = new MySqlDialect()
        this.$ = this.dialect.$
        this.types = new MySqlTypes()
        this.schema = new MySqlSchema(this)
    }
}

export class MySqlConnection extends ConnectionBase {}
