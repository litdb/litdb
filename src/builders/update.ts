import { Constructor, Fragment } from "../types"
import { WhereQuery } from "./where"

export class UpdateQuery<Tables extends Constructor<any>[]> extends WhereQuery<Tables> {
    private _set:string[] = []

    set(options:{ sql?:Fragment|Fragment[], rawSql?:string|string[], values?:Record<string,any> }) {
        if (!options) {
            this._set.length = 0
        } else if (options.sql) {
            const sql = Array.isArray(options.sql) ? options.sql : [options.sql]
            for (const fragment of sql) {
                this._set.push(fragment.sql)
                this.addParams(fragment.params)
            }
        }
        if (options.rawSql) {
            const sql = Array.isArray(options.rawSql) ? options.rawSql : [options.rawSql]
            for (const fragment of sql) {
                this._set.push(fragment)
            }
        }
        if (options.values) {
            for (const [key, value] of Object.entries(options.values)) {
                const prop = this.meta.props.find(x => x.name === key)
                if (!prop) throw new Error(`Property ${key} not found in ${this.meta.name}`)
                if (!prop.column) throw new Error(`Property ${key} is not a column`)
                this.params[prop.name] = value
                this._set.push(`${this.driver.quote(prop.column.name)} = $${prop.name}`)
            }
        }
        return this
    }

    get hasSet() { return this._set.length > 0 }

    buildUpdate() {
        const sqlSet = this._set.join(', ')
        const sql = `UPDATE ${this.quoteTable(this.meta.tableName)} SET ${sqlSet}${this.buildWhere()}`
        return sql
    }

    build() {
        const sql = this.buildUpdate()
        return { sql, params:this.params }
    }
}
