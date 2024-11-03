import { DataType, DialectTypes } from "../model"
import { Sqlite } from "../sqlite/driver"

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
    map : Record<string,DataType[]> = {
    }
}

export class MySql extends Sqlite
{
    static driver = new MySql()
    static init() {
        MySql.driver = new MySql()
        return MySql.driver
    }

    constructor() {
        super()
        this.types = new MySqlTypes()
    }
}
