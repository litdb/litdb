import { Schema } from "../schema"

export class SqliteSchema extends Schema {

    sqlTableNames(): string {
        return "SELECT name FROM sqlite_master WHERE type ='table' AND name NOT LIKE 'sqlite_%'"
    }
}
