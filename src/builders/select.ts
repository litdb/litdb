import { Schema } from "../connection"
import type { Constructor, Fragment, GroupByBuilder, TypeRefs } from "../types"
import { WhereQuery } from "./where"

type SelectOptions = {
    props?:string[],
    columns?:string[],
    sql?:Fragment|Fragment[],
}

export class SelectQuery<Tables extends Constructor<any>[]> extends WhereQuery<Tables> {

    protected _select:string[] = []
    protected _groupBy:string[] = []
    protected _having:string[] = []
    protected _skip:number | undefined
    protected _take:number | undefined
    protected _into: Constructor<any>|undefined

    copyInto(instance:SelectQuery<any>) {
        super.copyInto(instance)
        instance._select = Array.from(this._select)
        instance._groupBy = Array.from(this._groupBy)
        instance._having = Array.from(this._having)
        instance._skip = this._skip
        instance._take = this._take
        instance._into = this._into
        return instance
    }

    clone(): SelectQuery<Tables> { return super.clone() as SelectQuery<Tables> }

    groupBy(options:TemplateStringsArray|Fragment|GroupByBuilder|((...params:TypeRefs<Tables>) => Fragment), ...params:any[]) { 
        if (!options && params.length == 0) {
            this._groupBy.length = 0
        } else if (Array.isArray(options)) {
            const frag = this.$(options as TemplateStringsArray, ...params)
            this._groupBy.push(this.mergeParams(frag))
        } else if (typeof options == 'object') {
            const frag = typeof (options as any).build == 'function' 
                ? (options as any).build(this.refs)
                : Schema.assertSql(options)
            this._groupBy.push(this.mergeParams(frag))
        } else if (typeof options == 'function') {
            const frag = Schema.assertSql(options.call(this, ...this.refs))
            this._groupBy.push(this.mergeParams(frag))
        } else throw new Error(`Invalid Argument: ${typeof options}`)
        return this
    }

    having(options:TemplateStringsArray|Fragment|((...params:TypeRefs<Tables>) => Fragment), ...params:any[]) { 
        if (!options && params.length == 0) {
            this._having.length = 0
        } else if (Array.isArray(options)) {
            const frag = this.$(options as TemplateStringsArray, ...params)
            this._having.push(this.mergeParams(frag))
        } else if (typeof options == 'object') {
            const frag = Schema.assertSql(options)
            this._having.push(this.mergeParams(frag))
        } else if (typeof options == 'function') {
            const frag = Schema.assertSql(options.call(this, ...this.refs))
            this._having.push(this.mergeParams(frag))
        } else throw new Error(`Invalid Argument: ${typeof options}`)
        return this
    }

    select(options:SelectOptions|TemplateStringsArray|string|((...params:TypeRefs<Tables>) => Fragment), ...params:any[]) {
        if (!options && params.length === 0) {
            this._select.length = 0
        } else if (typeof options === 'string') {  
            this._select.push(options)
            if (params.length >= 1) {
                this.addParams(params[0])
            }
        } else if (Array.isArray(options)) {
            this._select.push(this.mergeParams(this.$(options as TemplateStringsArray, ...params)))
        } else if (typeof options === 'object') {
            const o = options as SelectOptions
            if (o.sql) {
                const sql = Array.isArray(o.sql) ? o.sql : [o.sql]
                for (const fragment of sql) {
                    this._select.push(fragment.sql)
                    this.addParams(fragment.params)
                }
            }
            if (o.props) {
                for (const name of o.props) {
                    const column = this.meta.props.find(x => x.name == name)?.column
                    if (column) {
                        this._select.push(this.quoteColumn(column.name))
                    }
                }
            }
            if (o.columns) {
                for (const name of o.columns) {
                    this._select.push(this.quoteColumn(name))
                }
            }
        } else if (typeof options == 'function') {
            const sql = Schema.assertSql(options.call(this, ...this.refs))
            this._select.push(this.mergeParams(sql))
        } else throw new Error(`Invalid select(${typeof options})`)
        return this
    }

    get hasSelect() { return this._select.length > 0 }

    skip(rows?:number) {
        this._skip = rows == null ? undefined : rows
        return this
    }
    take(rows?:number) {
        this._take = rows == null ? undefined : rows
        return this
    }
    limit(skip?:number, take?:number) {
        this._skip = skip == null ? undefined : skip
        this._take = take == null ? undefined : take
        return this
    }

    into<T extends Constructor<any>>(cls:T) {
        this._into = cls
        return this
    }

    buildSelect() {
        //console.log('buildSelect', this._select)
        const sqlSelect = this._select.length > 0 
            ? this._select.join(', ') 
            : this.meta.columns.map(x => this.quoteColumn(x.name)).join(', ')
        const sql = `SELECT ${sqlSelect}`
        return sql
    }

    buildFrom() {
        const quotedTable = this.quoteTable(this.meta.tableName)
        let sql = `\n  FROM ${quotedTable}`
        const alias = this.refs[0].$ref.as
        if (alias && alias != quotedTable) {
            sql += ` ${alias}`
        }
        return sql
    }

    buildGroupBy() {
        if (this._groupBy.length == 0) return ''
        return `\n GROUP BY ${this._groupBy.join(', ')}`
    }

    buildHaving() {
        if (this._having.length == 0) return ''
        return `\n HAVING ${this._having.join(', ')}`
    }

    buildLimit() {
        const sql = this.driver.sqlLimit(this._skip, this._take)
        return sql
    }

    build() {
        let sql = this.buildSelect() + this.buildFrom() + this.buildJoins() + this.buildWhere() + this.buildGroupBy() + this.buildHaving()
        // console.log(`\n${sql}\n`)
        return { 
            sql,
            params: this.params, 
            into: this._into ?? (this._select.length == 0 ? this.tables[0] : undefined) 
        }
    }
}
