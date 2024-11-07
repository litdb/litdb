import type { ColumnType, DialectTypes, Driver } from "../types"
import { Sqlite } from "../sqlite/driver"
import { MySqlDialect } from "./dialect"
import { MySqlSchema } from "./schema"
import { ConnectionBase } from "../connection"
import { Schema } from "../schema"

class MySqlTypes implements DialectTypes {
    // use as-is
    native:ColumnType[] = [
        "INTEGER", "SMALLINT", "BIGINT", // INTEGER
        "REAL", "DOUBLE", "FLOAT", "DECIMAL",  // REAL
        "NUMERIC", "DECIMAL", "MONEY", //NUMERIC 
        "BOOLEAN", 
        "DATE", "DATETIME",
        "TIME", "TIMESTAMP", "INTERVAL",
        "UUID", "JSON", "JSONB", "XML", 
        "BLOB", "BYTES", "BIT",
    ]
    // use these types instead
    map : Record<string,ColumnType[]> = {
        "DOUBLE":        ["REAL"],
        "TIME":          ["TIMEZ"],
        "TIMESTAMP":     ["TIMESTAMPZ"],
        "INTEGER":       ["INTERVAL"],
        "JSON":          ["JSONB"],
        "TEXT":          ["XML"],
        "BINARY":        ["BYTES"],
        "BINARY(1)":     ["BIT"],
        "DECIMAL(15,2)": ["MONEY"],
    }
}
//

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
        this.schema = this.$.schema = new MySqlSchema(this)
    }
}

export class MySqlConnection extends ConnectionBase {}
