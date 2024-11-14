import { SqliteSchema } from "../sqlite/schema"

export class MySqlSchema extends SqliteSchema {
    sqlTableNames() {
        return "SELECT table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema = DATABASE()"
    }
}
