import type { ColumnType, DialectTypes, Driver, TypeConverter } from "../types"
import { Sqlite } from "../sqlite/driver"
import { MySqlDialect } from "./dialect"
import { MySqlSchema } from "./schema"
import { ConnectionBase } from "../connection"
import { Schema } from "../schema"
import { dateISOString, toDate } from "../utils"
import { converterFor } from "../converters"

export class MySqlTypes implements DialectTypes {
    // use as-is
    native:ColumnType[] = [
        "INTEGER", "SMALLINT", "BIGINT", // INTEGER
        "DOUBLE", "FLOAT", "DECIMAL",    // REAL
        "NUMERIC", "DECIMAL",            // NUMERIC 
        "BOOLEAN", 
        "DATE", "DATETIME",
        "TIME", "TIMESTAMP",
        "UUID", "JSON", "XML", 
        "BLOB",
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
        this.schema = this.$.schema = new MySqlSchema(this, this.$, new MySqlTypes())
        Object.assign(this.schema.converters, 
            converterFor(new DateConverter, "DATE", "DATETIME", "TIMESTAMP", "TIMESTAMPZ"))
    }
}

export class MySqlConnection extends ConnectionBase {}

class DateConverter implements TypeConverter
{
    toDb(value: any) {
        const d = toDate(value)
        return d ? dateISOString(d).replace('T',' ') : null
    }
    fromDb(value: any) {
        if (!value) return null
        return toDate(value)
    }
}

