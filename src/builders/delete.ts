import type { Constructor } from "../types"
import { WhereQuery } from "./where"

export class DeleteQuery<Tables extends Constructor<any>[]> extends WhereQuery<Tables> { 

    buildDelete() {
        const sql = `DELETE FROM ${this.quoteTable(this.meta.tableName)}${this.buildWhere()}`
        return sql
    }

    build() {
        const sql = this.buildDelete()
        return { sql, params:this.params }
    }
}
