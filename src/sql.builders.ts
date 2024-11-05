import type { 
    Constructor, First, Last, Fragment, TypeRef, TypeRefs, WhereOptions, 
    GroupByBuilder, HavingBuilder, JoinBuilder, OrderByBuilder, SqlBuilder,
    JoinDefinition, JoinParams, JoinType,
    IntoFragment, 
} from "./types"
import { Meta } from "./meta"
import { assertSql } from "./schema"
import { Sql } from "./sql"
import { asRef, asType, isTemplateStrings, leftPart, nextParam, toStr } from "./utils"
import { alignRight } from "./inspect"

type OnJoin<
    First extends Constructor<any>, 
    Second extends Constructor<any>,
    Table extends Constructor<any>> = (
        from: TypeRef<InstanceType<First>>, 
        to: TypeRef<InstanceType<Second>>, 
        table:TypeRef<InstanceType<Table>>) => Fragment

function joinOptions<NewTable extends Constructor<any>>(type:JoinType, 
    cls:NewTable,
    options?:JoinParams|SqlBuilder|Fragment,
    ref?:TypeRef<InstanceType<NewTable>>) : { 
        type:JoinType, 
        cls:NewTable|TypeRef<InstanceType<NewTable>>
        ref?:TypeRef<InstanceType<NewTable>>
        on?:string | ((...params:any[]) => Fragment),
        as?:string
        params?:Record<string,any>
    } {
    if (typeof options == 'object') {
        if ((options as any)?.sql) {
            const { sql, params } = options as Fragment
            return { type, cls, ref, on:sql, params }
        } else {
            options = options as JoinParams
            return { type, cls, ref, as:options?.as, on:options?.on, params:options?.params }
        }
    } else if (typeof options == 'function') {
        const builder = options as SqlBuilder
        const { sql, params } = builder.build()
        return { type, cls, on:sql, params }
    } else throw new Error(`Invalid Join Option: ${typeof options}`)
}

// Helper type for determining the query class type
type QueryType<T> = 
    T extends SelectQuery<any> ? SelectQuery<any> :
    T extends UpdateQuery<any> ? UpdateQuery<any> :
    T extends DeleteQuery<any> ? DeleteQuery<any> :
    WhereQuery<any>

// Fixed This type helper
type This<T, NewTables extends Constructor<any>[]> = 
    QueryType<T> extends SelectQuery<any> ? SelectQuery<NewTables> :
    QueryType<T> extends UpdateQuery<any> ? UpdateQuery<NewTables> :
    QueryType<T> extends DeleteQuery<any> ? DeleteQuery<NewTables> :
    WhereQuery<NewTables>

export class WhereQuery<Tables extends Constructor<any>[]> implements SqlBuilder {
  
    constructor(
        public $:ReturnType<typeof Sql.create>, 
        public tables: [...Tables], 
        public metas:Meta[], 
        public refs: TypeRefs<Tables>
    ) {
    }

    protected _where:{ condition:string, sql?:string }[] = []
    protected _joins:JoinDefinition[] = []
    public params:Record<string,any> = {}

    get ref() : TypeRef<InstanceType<First<Tables>>> { return this.refs[0] }
    get meta() { return this.metas[0] }
    get hasWhere() { return this._where.length > 0 }

    refOf<T>(cls:Constructor<T>) : TypeRef<T>|null {
        for (const ref of this.refs) {
            if (cls == ref.$ref.cls) {
                return ref
            }
        }
        return null
    }

    refsOf<T extends readonly Constructor<any>[]>(...classes: [...T]): { 
        [K in keyof T]: TypeRef<InstanceType<T[K]>> 
    } {
        return classes.map(cls => {
            const ret = this.refOf(cls)
            if (ret == null)
                throw new Error(`Could not find ref for '${cls.name}'`)
            return ret
        }) as { [K in keyof T]: TypeRef<InstanceType<T[K]>> }
    }

    protected createInstance<NewTable extends Constructor<any>>(
        table: NewTable, ref?:TypeRef<InstanceType<NewTable>>
    ) : This<typeof this, [...Tables, NewTable]> {
        const meta = Meta.assertMeta(table)
        ref = ref ?? this.$.ref(table)
        
        return new (this.constructor as any)(
            this.$,
            [...this.tables, table],
            [...this.metas, meta],
            [...this.refs, ref]
        );
    }

    copyInto(instance:WhereQuery<any>) {
        instance.params = Object.assign({}, this.params)
        instance._where = Array.from(this._where)
        instance._joins = Array.from(this._joins)
        return instance
    }

    clone() : WhereQuery<Tables> {
        const instance = new (this.constructor as any)(
            this.$,
            [...this.tables],
            [...this.metas],
            [...this.refs]
        )
        this.copyInto(instance)
        return instance
    }

    protected addJoin<NewTable extends Constructor<any>>(options:{ 
        type:JoinType, 
        cls:NewTable
        ref?:TypeRef<InstanceType<NewTable>>
        on?:string | ((...params:any[]) => Fragment),
        as?:string
        params?:Record<string,any>
    }) : This<typeof this, [...Tables, NewTable]> {
        const table = options.cls as NewTable
        const ref = options?.ref ?? (options.as ? this.$.ref(table, options.as) : undefined)
        const instance = this.createInstance(table, ref)
        this.copyInto(instance as any)

        let q = instance as WhereQuery<any>

        // Fully qualify Table ref if it has no alias
        if (!q.refs[0].$ref.as) {
            q.refs[0] = q.$.ref(q.meta.cls as First<Tables>, q.quoteTable(q.meta.tableName))
        }

        let on = ''
        const qProtected = q as any
        if (typeof options.on == 'string') {
            on = options.params
                ? qProtected.mergeParams({ sql:options.on, params:options.params })
                : options.on
        } else if (typeof options.on == 'function') {
            const refs = q.refs.slice(-2).concat([q.ref])
            const sql = assertSql(options.on.call(q, ...refs))
            on = qProtected.mergeParams(sql)
        }
        qProtected._joins.push({ type:options.type, table, on, params:options.params })
        return instance
    }

    protected joinBuilder<NewTable extends Constructor<any>>(builder:JoinBuilder<NewTable>, typeHint:JoinType="JOIN") 
        : This<typeof this, [...Tables, NewTable]> {
        const cls = builder.tables[0] as NewTable
        const q = this.createInstance(cls)
        this.copyInto(q as WhereQuery<any>)

        const refs = builder.tables.map(cls => this.refOf(cls) ?? this.$.ref(cls))
        let { type, on, params } = builder.build(refs, typeHint)
        if (on && params) {
            on = this.mergeParams({ sql:on, params })
        }
        const qProtected = q as any
        qProtected._joins.push({ type, on, params })

        return q
    }

    join<NewTable extends Constructor<any>>(cls:NewTable|JoinBuilder<NewTable>|TypeRef<InstanceType<NewTable>>,
        options?:{ 
        on?:OnJoin<Last<Tables>, NewTable, First<Tables>>
        as?:string 
    }|SqlBuilder|Fragment) {
        if (typeof cls != 'object' && typeof cls != 'function') throw new Error(`invalid argument: ${typeof cls}`)
        return !(cls as any)?.$ref && (cls as any).tables
            ? this.joinBuilder<NewTable>(cls as JoinBuilder<NewTable>, "JOIN")
            : this.addJoin<NewTable>(joinOptions<NewTable>("JOIN", asType(cls), options, asRef(cls)))
    }
    leftJoin<NewTable extends Constructor<any>>(cls:NewTable|TypeRef<InstanceType<NewTable>>,
        options?:{ 
        on?:OnJoin<Last<Tables>, NewTable, First<Tables>>
        as?:string 
    }|SqlBuilder|Fragment) {
        if (typeof cls != 'object' && typeof cls != 'function') throw new Error(`invalid argument: ${typeof cls}`)
        return this.addJoin<NewTable>(joinOptions<NewTable>("LEFT JOIN", asType(cls), options, asRef(cls)))
    }
    rightJoin<NewTable extends Constructor<any>>(cls:NewTable|TypeRef<InstanceType<NewTable>>,
        options?:{ 
        on?:OnJoin<Last<Tables>, NewTable, First<Tables>>
        as?:string 
    }|SqlBuilder|Fragment) {
        if (typeof cls != 'object' && typeof cls != 'function') throw new Error(`invalid argument: ${typeof cls}`)
        return this.addJoin<NewTable>(joinOptions<NewTable>("RIGHT JOIN", asType(cls), options, asRef(cls)))
    }
    fullJoin<NewTable extends Constructor<any>>(cls:NewTable|TypeRef<InstanceType<NewTable>>,
        options?:{ 
        on?:OnJoin<Last<Tables>, NewTable, First<Tables>>
        as?:string 
    }|SqlBuilder|Fragment) {
        if (typeof cls != 'object' && typeof cls != 'function') throw new Error(`invalid argument: ${typeof cls}`)
        return this.addJoin<NewTable>(joinOptions<NewTable>("FULL JOIN", asType(cls), options, asRef(cls)))
    }
    crossJoin<NewTable extends Constructor<any>>(cls:NewTable|TypeRef<InstanceType<NewTable>>,
        options?:{ 
        on?:OnJoin<Last<Tables>, NewTable, First<Tables>>
        as?:string 
    }|SqlBuilder|Fragment) {
        if (typeof cls != 'object' && typeof cls != 'function') throw new Error(`invalid argument: ${typeof cls}`)
        return this.addJoin<NewTable>(joinOptions<NewTable>("CROSS JOIN", asType(cls), options, asRef(cls)))
    }

    where(options:WhereOptions|TemplateStringsArray|((...params:TypeRefs<Tables>) => Fragment), ...params:any[]) { 
        return this.and(options, ...params)
    }

    and(options:WhereOptions|TemplateStringsArray|((...params:TypeRefs<Tables>) => Fragment), ...params:any[]) {
        if (!options && params.length == 0) {
            this._where.length = 0
            return this
        } else if (isTemplateStrings(options)) {
            return this.condition('AND', { sql: this.$(options as TemplateStringsArray, ...params) }) 
        } else if (typeof options == 'function') {
            const sql = assertSql(options.call(this, ...this.refs))
            return this.condition('AND', { sql })
        } else {
            return this.condition('AND', options as WhereOptions) 
        }
    }

    or(options:WhereOptions|TemplateStringsArray|((...params:TypeRefs<Tables>) => Fragment), ...params:any[]) { 
        if (!options && params.length == 0) {
            this._where.length = 0
            return this
        } else if (Array.isArray(options)) {
            return this.condition('OR', { sql: this.$(options as TemplateStringsArray, ...params) }) 
        } else if (typeof options == 'function') {
            const sql = assertSql(options.call(this, ...this.refs))
            return this.condition('OR', { sql })
        } else {
            return this.condition('OR', options as WhereOptions) 
        }
    }

    condition(condition:"AND"|"OR", options:WhereOptions) {
        if (options.sql) {
            this._where.push({ condition:condition, sql:this.mergeParams(options.sql) })
        }
        if (options.rawSql) {
            const sql = Array.isArray(options.rawSql) ? options.rawSql : [options.rawSql]
            for (const fragment of sql) {
                this._where.push({ condition, sql:fragment })
            }
            this.addParams(options.params)
        }
        for (const [op, values] of Object.entries(options)) {
            if (Sql.opKeys.includes(op)) {
                this.addWhere(condition, Sql.ops[op], values, op)
            } else if (op === 'op' && Array.isArray(values) && values.length >= 2) {
                const [ sqlOp, params ] = values
                this.addWhere(condition, sqlOp, params)
            }
        }
        return this
    }

    quote(symbol:string) { return this.$.quote(symbol) }
    quoteTable(table:string) { return this.$.quoteTable(table) }
    
    quoteColumn(column:string) { 
        const as = this.ref.$ref.as
        const prefix = as ? as + '.' : ''
        return prefix + this.$.quoteColumn(column) 
    }

    as(alias?:string) {
        this.refs[0] = this.$.ref(this.refs[0].$ref.cls, alias)
        return this
    }

    protected addParams(params?:Record<string,any>) {
        if (params && typeof params == 'object') {
            for (const [key, value] of Object.entries(params)) {
                this.params[key] = value
            }
        }
    }

    protected mergeParams(f:Fragment) {
        let sql = f.sql
        if (f.params && typeof f.params == 'object') {
            for (const [key, value] of Object.entries(f.params)) {
                const exists = key in this.params && key[0] === '_' && !isNaN(parseInt(key.substring(1)))
                if (exists) {
                    const nextvalue = nextParam(this.params)
                    sql = sql.replaceAll(`$${key}`,`$${nextvalue}`)
                    this.params[nextvalue] = value
                } else {
                    this.params[key] = value
                }
            }
        }
        return sql
    }

    private addWhere(condition:string, sqlOp:string, values:any, op?:string) {
        if (!condition) throw new Error('condition is required')
        if (!sqlOp) throw new Error('sqlOp is required')
        if (!values) throw new Error('values is required')
        if (op === 'isNull' || op === 'notNull') {
            if (!Array.isArray(values)) throw new Error(`${op} requires an array of property names, but was: ${toStr(values)}`)
            let columnNames = [] as string[]
            for (const key of values) {
                const prop = this.meta.props.find(x => x.name === key)
                if (!prop) throw new Error(`Property ${key} not found in ${this.meta.name}`)
                if (!prop.column) throw new Error(`Property ${key} is not a column`)
                columnNames.push(prop.column.name)
            }
            const sql = columnNames.map(name => `${this.$.quoteColumn(name)} ${Sql.ops[op]}`).join(` ${condition} `)
            this._where.push({ condition, sql })
            //console.log('addWhere', condition, sqlOp, values, op)
            //return
        } else if (typeof values == 'object') {
            for (const [key, value] of Object.entries(values)) {
                const prop = this.meta.props.find(x => x.name === key)
                if (!prop) throw new Error(`Property ${key} not found in ${this.meta.name}`)
                if (!prop.column) throw new Error(`Property ${key} is not a column`)
                const sqlLeft = `${this.$.quoteColumn(prop.column.name)} ${sqlOp}`
                if (Array.isArray(value)) {
                    let sqlValues = ``
                    for (const v in value) {
                        if (sqlValues) sqlValues += ','
                        const nextValue = nextParam(this.params)
                        sqlValues += `$${nextValue}`
                        this.params[nextValue] = v
                    }
                    this._where.push({ condition, sql:`${sqlLeft} (${sqlValues})`})
                } else {
                    this._where.push({ condition, sql:`${sqlLeft} $${prop.name}`})
                    let paramValue = op === 'startsWith'
                        ? `${value}%`
                        : op === 'endsWith'
                        ? `%${value}`
                        : op === 'contains'
                        ? `%${value}%`
                        : value
                    this.params[prop.name] = paramValue
                }
            }
        } else throw new Error(`Unsupported ${condition} value: ${values}`)
    }

    protected buildWhere() {
        if (this._where.length === 0) return ''
        let sb = '\n WHERE '
        for (const [i, { condition, sql }] of this._where.entries()) {
            if (i > 0) sb += `\n${alignRight(condition, 5)}`
            sb += sql
        }
        // console.log(this._where)
        return sb
    }

    protected buildJoins() {
        if (this._joins.length == 0) return ''
        let sql = ''
        for (let i = 0; i<this._joins.length; i++) {
            const { type, on } = this._joins[i]
            const ref = this.refs[i + 1]
            const meta = this.metas[i + 1]
            const quotedTable = this.$.quoteTable(meta.tableName)
            const refAs = ref.$ref.as
            const sqlAs = refAs && refAs !== quotedTable
                ? ` ${refAs}`
                : ''
            const sqlOn = typeof on == 'string'
                ? ` ON ${on}`
                : ''
            let joinType = type ?? 'JOIN'
            const spaces = leftPart(joinType, ' ')!.length <= 4 ? '  ' : ' '
            sql += `\n${spaces}${type ?? 'JOIN'} ${quotedTable}${sqlAs}${sqlOn}`
        }
        return sql
    }

    into<T extends Constructor<any>>(into: T) : IntoFragment<InstanceType<T>> {
        const { sql, params } = this.build()
        return { sql, params, into }
    }

    build() {
        const sql = this.buildWhere()
        // console.log(`\n${sql}\n`)
        const params = this.params
        return { sql, params }
    }
}


type SelectOptions = {
    props?:string[],
    columns?:string[],
    sql?:Fragment|Fragment[],
}

export class SelectQuery<Tables extends Constructor<any>[]> extends WhereQuery<Tables> {

    protected _select:string[] = []
    protected _groupBy:string[] = []
    protected _having:string[] = []
    protected _orderBy:string[] = []
    protected _skip:number | undefined
    protected _take:number | undefined
    protected _limit?:string

    copyInto(instance:SelectQuery<any>) {
        super.copyInto(instance)
        instance._select = Array.from(this._select)
        instance._groupBy = Array.from(this._groupBy)
        instance._having = Array.from(this._having)
        instance._skip = this._skip
        instance._take = this._take
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
                : assertSql(options)
            this._groupBy.push(this.mergeParams(frag))
        } else if (typeof options == 'function') {
            const frag = assertSql(options.call(this, ...this.refs))
            this._groupBy.push(this.mergeParams(frag))
        } else throw new Error(`Invalid Argument: ${typeof options}`)
        return this
    }

    having(options:TemplateStringsArray|Fragment|HavingBuilder|((...params:TypeRefs<Tables>) => Fragment), ...params:any[]) { 
        if (!options && params.length == 0) {
            this._having.length = 0
        } else if (Array.isArray(options)) {
            const frag = this.$(options as TemplateStringsArray, ...params)
            this._having.push(this.mergeParams(frag))
        } else if (typeof options == 'object') {
            const frag = typeof (options as any).build == 'function' 
                ? (options as any).build(this.refs)
                : assertSql(options)
            this._having.push(this.mergeParams(frag))
        } else if (typeof options == 'function') {
            const frag = assertSql(options.call(this, ...this.refs))
            this._having.push(this.mergeParams(frag))
        } else throw new Error(`Invalid Argument: ${typeof options}`)
        return this
    }

    orderBy(options:TemplateStringsArray|Fragment|OrderByBuilder|((...params:TypeRefs<Tables>) => Fragment), ...params:any[]) { 
        if (!options && params.length == 0) {
            this._orderBy.length = 0
        } else if (Array.isArray(options)) {
            const frag = this.$(options as TemplateStringsArray, ...params)
            this._orderBy.push(this.mergeParams(frag))
        } else if (typeof options == 'object') {
            const frag = typeof (options as any).build == 'function' 
                ? (options as any).build(this.refs)
                : assertSql(options)
            this._orderBy.push(this.mergeParams(frag))
        } else if (typeof options == 'function') {
            const frag = assertSql(options.call(this, ...this.refs))
            this._orderBy.push(this.mergeParams(frag))
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
            const sql = assertSql(options.call(this, ...this.refs))
            this._select.push(this.mergeParams(sql))
        } else throw new Error(`Invalid select(${typeof options})`)
        return this
    }

    get hasSelect() { return this._select.length > 0 }

    skip(rows?:number) {
        return this.limit(this._take, rows)
    }
    take(rows?:number) {
        return this.limit(rows, this._skip)
    }
    limit(take?:number, skip?:number) {
        this._take = take == null ? undefined : take
        this._skip = skip == null ? undefined : skip
        if (take == null && skip == null) {
            this._limit = undefined
        } else {
            const frag = this.$.dialect.sqlLimit(this._skip, this._take) 
            this._limit = this.mergeParams(frag)
        }
        return this
    }

    protected buildSelect() {
        //console.log('buildSelect', this._select)
        const sqlSelect = this._select.length > 0 
            ? this._select.join(', ') 
            : this.meta.columns.map(x => this.quoteColumn(x.name)).join(', ')
        const sql = `SELECT ${sqlSelect}`
        return sql
    }

    protected buildFrom() {
        const quotedTable = this.quoteTable(this.meta.tableName)
        let sql = `\n  FROM ${quotedTable}`
        const alias = this.refs[0].$ref.as
        if (alias && alias != quotedTable) {
            sql += ` ${alias}`
        }
        return sql
    }

    protected buildGroupBy() {
        if (this._groupBy.length == 0) return ''
        return `\n GROUP BY ${this._groupBy.join(', ')}`
    }

    protected buildHaving() {
        if (this._having.length == 0) return ''
        return `\n HAVING ${this._having.join('\n   AND ')}`
    }

    protected buildOrderBy() {
        if (this._orderBy.length == 0) return ''
        return `\n ORDER BY ${this._orderBy.join(', ')}`
    }

    protected buildLimit() {
        return this._limit ? `\n ${this._limit}` : ''
    }

    build() {
        let sql = this.buildSelect() 
            + this.buildFrom() 
            + this.buildJoins() 
            + this.buildWhere() 
            + this.buildGroupBy() 
            + this.buildHaving()
            + this.buildOrderBy()
            + this.buildLimit()
        // console.log(`\n${sql}\n`)
        const params = this.params
        return { sql, params }
    }
}

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
                this._set.push(`${this.$.quote(prop.column.name)} = $${prop.name}`)
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
