import type { 
    Constructor, ConstructorsToRefs, ConstructorToTypeRef, Dialect, First, Fragment, 
    GroupByBuilder, HavingBuilder, JoinBuilder, JoinType, OrderByBuilder, SqlBuilder, TypeRef 
} from "./types"
import { Meta, Schema } from "./connection"
import { mergeParams } from "./utils"
import { alignRight } from "./inspect"

export class Sql
{
    static ops:{[key:string]:string} = {
        equals:     '=',
        '=':        '=',
        notEquals:  '<>',
        '!=':       '!=',
        like:       'LIKE',
        startsWith: 'LIKE',
        endsWith:   'LIKE',
        contains:   'LIKE',
        notLike:    'NOT LIKE',
        in:         'IN',
        notIn:      'NOT IN',
        isNull:     'IS NULL',
        notNull:    'IS NOT NULL',
    }

    static opKeys = Object.keys(Sql.ops)

    public static create(dialect:Dialect) {
        function $(strings: TemplateStringsArray|string, ...params: any[]) : Fragment {
            if (Array.isArray(strings)) {
                let sb = ''
                const sqlParams:Record<string,any> = {}
                for (let i = 0; i < strings.length; i++) {
                    sb += strings[i]
                    if (i >= params.length) continue
                    const value = params[i]
                    if (typeof value == 'symbol') {
                        // include symbol literal as-is
                        sb += value.description ?? ''
                    } else if (typeof value == 'object' && value.$ref) {
                        // if referencing proxy itself, return its quoted tableName
                        sb += dialect.quoteTable(Schema.assertMeta(value.$ref.cls).tableName)
                    } else if (typeof value == 'object' && typeof value.build == 'function') {
                        // Merge params of SqlBuilder and append SQL
                        const frag = (value as SqlBuilder).build()
                        sb += mergeParams(sqlParams, frag).replaceAll('\n', '\n      ')
                    } else if (typeof value == 'object' && typeof value.sql == 'string') {
                        // Merge params of Sql Fragment and append SQL
                        const frag = value as Fragment
                        sb += mergeParams(sqlParams, frag).replaceAll('\n', '\n      ')
                    } else if (value) {
                        const paramIndex = Object.keys(sqlParams).length + 1
                        const name = `${paramIndex}`
                        sb += `$${name}`
                        sqlParams[name] = value
                    }
                }
                return ({ sql:sb, params:sqlParams })
            } else if (typeof strings === 'string') {
                return ({ sql:strings, params:params[0] })
            } else throw new Error(`sql(${typeof strings}) is invalid`)
        }
        $.dialect = dialect
        $.quote = dialect.quote.bind(dialect)
        $.quoteColumn = dialect.quoteColumn.bind(dialect)
        $.quoteTable = dialect.quoteTable.bind(dialect)
    
        function quoteProp(meta:Meta, prop:string) {
            const p = meta.props.find(x => x.name == prop)?.column
            if (!p) throw new Error(`${meta.name} does not have a column property ${prop}`)
            return dialect.quoteColumn(p.name)
        }
        $.ref = function<Table extends Constructor<any>>(cls:Table, as?:string) : TypeRef<InstanceType<Table>> {
            const meta = Schema.assertMeta(cls)
            if (as == null)
                as = dialect.quoteTable(meta.tableName)
            const get = (target: { prefix:string, meta:Meta }, key:string|symbol) => key == '$ref' 
                ? { cls, as }
                : Symbol(target.prefix + quoteProp(meta, typeof key == 'string' ? key : key.description!))
            const p = new Proxy({ prefix: as ? as + '.' : '', meta }, { get })
            return p as any as TypeRef<InstanceType<Table>>
        }
        $.refs = function refs<T extends readonly Constructor[]>(...classes: [...T]): ConstructorToTypeRef<T> {
            return classes.map(cls => $.ref(cls)) as ConstructorToTypeRef<T>
        }
        $.fragment = function(sql:string, params:Record<string,any>): Fragment {
            return ({ sql, params })
        }
        $.join = function<Tables extends Constructor<any>[]>(...tables:Tables) {
            return new SqlJoinBuilder<Tables>($, ...tables)
        }
        $.groupBy = function<Tables extends Constructor<any>[]>(...tables:Tables) {
            return new SqlGroupByBuilder<Tables>($, ...tables)
        }
        $.having = function<Tables extends Constructor<any>[]>(...tables:Tables) {
            return new SqlHavingBuilder<Tables>($, ...tables)
        }
        $.orderBy = function<Tables extends Constructor<any>[]>(...tables:Tables) {
            return new SqlOrderByBuilder<Tables>($, ...tables)
        }
    
        return $
    }
}


export class SqlJoinBuilder<Tables extends Constructor<any>[]> implements JoinBuilder<First<Tables>> {
    get table() { return this.tables[0] as First<Tables> }
    tables: Tables
    refs: ConstructorsToRefs<Tables>
    exprs:{ type:JoinType, expr:((refs:ConstructorsToRefs<Tables>) => Fragment) }[]=[]

    params:Record<string,any> = {}
    alias:string =''
    buildOn?:(refs:ConstructorsToRefs<Tables>, params:Record<string,any>) => string

    constructor(public $:ReturnType<typeof Sql.create>, ...tables:Tables) {
        this.tables = tables
        this.refs = this.tables.map(x => this.$.ref(x)) as ConstructorsToRefs<Tables>
    }

    join(expr: ((...args: ConstructorsToRefs<Tables>) => Fragment)|TemplateStringsArray, ...params: any[]) {
        return this.add("JOIN", expr, ...params)
    }
    leftJoin(expr: ((...args: ConstructorsToRefs<Tables>) => Fragment)|TemplateStringsArray, ...params: any[]) {
        return this.add("LEFT JOIN", expr, ...params)
    }
    rightJoin(expr: ((...args: ConstructorsToRefs<Tables>) => Fragment)|TemplateStringsArray, ...params: any[]) {
        return this.add("RIGHT JOIN", expr, ...params)
    }
    fullJoin(expr: ((...args: ConstructorsToRefs<Tables>) => Fragment)|TemplateStringsArray, ...params: any[]) {
        return this.add("FULL JOIN", expr, ...params)
    }
    crossJoin(expr: ((...args: ConstructorsToRefs<Tables>) => Fragment)|TemplateStringsArray, ...params: any[]) {
        return this.add("CROSS JOIN", expr, ...params)
    }

    add(type:JoinType, expr: ((...args: ConstructorsToRefs<Tables>) => Fragment)|TemplateStringsArray, ...params: any[]) {
        if (Array.isArray(expr)) {
            this.exprs.push({ type, expr:_ => this.$(expr as TemplateStringsArray, ...params)})
        } else if (typeof expr == 'function') {
            this.exprs.push({ type, expr:(refs:ConstructorsToRefs<Tables>) => expr.call(this, ...refs as any) })
        }
        return this
    }

    as(alias:string) {
        this.alias = alias
        return this
    }

    build(refs:ConstructorsToRefs<Tables>) {
        if (this.alias != null) {
            refs[0].$ref.as = this.$.ref(refs[0].$ref.cls, this.alias)
        }
        const params:Record<string,any> = {}
        const sqls:string[] = []
        for (const join of this.exprs) {
            const result = join.expr(refs)
            const prefix = sqls.length ? `${alignRight(join.type, 5)}` : ''
            sqls.push(`${prefix} ${mergeParams(params, result)}`)
        }
        const on = sqls.join('')
        return { type:this.exprs[0].type, on, params }
    }
}

export class SqlBuilderBase<Tables extends Constructor<any>[]> {
    tables:Tables
    params:Record<string,any> = {}
    exprs:((refs:ConstructorsToRefs<Tables>) => Fragment)[]=[]
    delimiter = ', '

    constructor(public $:ReturnType<typeof Sql.create>, ...tables:Tables) {
        this.tables = tables
    }

    add(expr: ((...args: ConstructorsToRefs<Tables>) => Fragment)|TemplateStringsArray, ...params: any[]) {
        if (Array.isArray(expr)) {
            this.exprs.push(_ => this.$(expr as TemplateStringsArray, ...params))
        } else if (typeof expr == 'function') {
            this.exprs.push((refs:ConstructorsToRefs<Tables>) => expr.call(this, ...refs as any))
        }
        return this
    }

    build(refs:ConstructorsToRefs<Tables>) {
        const params:Record<string,any> = {}
        const sqls:string[] = []
        for (const expr of this.exprs) {
            const result = expr(refs)
            sqls.push(mergeParams(params, result))
        }
        const sql = sqls.join(this.delimiter)
        return { sql, params }
    }
}

export class SqlGroupByBuilder<Tables extends Constructor<any>[]> extends SqlBuilderBase<Tables> implements GroupByBuilder {}
export class SqlOrderByBuilder<Tables extends Constructor<any>[]> extends SqlBuilderBase<Tables> implements OrderByBuilder {}
export class SqlHavingBuilder<Tables extends Constructor<any>[]> extends SqlBuilderBase<Tables> implements HavingBuilder {
    constructor($:ReturnType<typeof Sql.create>, ...tables:Tables) {
        super($, ...tables)
        this.delimiter = '\n  AND '
    }
}
