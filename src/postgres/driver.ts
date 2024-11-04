import type { ColumnType, DialectTypes } from "../types"
import { DataType } from "../model"
import { Sqlite } from "../sqlite/driver"
import { PostgreSqlDialect } from "./dialect"
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
    static driver = new PostgreSql()
    static get schema() { return PostgreSql.driver.schema }

    static init() {
        PostgreSql.driver = new PostgreSql()
        return PostgreSql.driver
    }

    constructor() {
        super()
        this.types = new PostgreSqlTypes()
        this.dialect = new PostgreSqlDialect()
        this.$ = this.dialect.$
        this.schema = new Schema(this)
    }
}
