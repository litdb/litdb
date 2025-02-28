import type { 
    Constructor, ConstructorsToRefs, ConstructorToTypeRef, Dialect, First, Fragment, 
    GroupByBuilder, HavingBuilder, JoinBuilder, JoinType, OrderByBuilder, SqlBuilder, TypeRef 
} from "./types"
import { Meta } from "./meta"
import { asRef, asType, IS, mergeParams, nextParamVal, trimEnd, } from "./utils"
import { alignRight, Inspect } from "./inspect"
import { SelectQuery, UpdateQuery, DeleteQuery } from "./sql.builders"
import { DriverRequiredProxy, Schema } from "./schema"

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
        function $(strings:TemplateStringsArray|string, ...params: any[]) : Fragment {
            if (IS.tpl(strings)) {
                // console.log(`raw`, strings.raw, strings, params)
                let sb = ''
                const sqlParams:Record<string,any> = {}
                for (let i = 0; i < strings.length; i++) {
                    sb += strings[i]
                    if (i >= params.length) continue
                    const val = params[i]
                    if (IS.sym(val)) {
                        // include symbol literal as-is
                        sb += val.description ?? ''
                    } else if (IS.arr(val)) {
                        // expand arrays into multiple params
                        let sbIn = ''
                        for (const item of val) {
                            const paramIndex = Object.keys(sqlParams).length + 1
                            const name = `_${paramIndex}`
                            if (sbIn.length) sbIn += ','
                            sbIn += `$${name}`
                            sqlParams[name] = item
                        }
                        sb += sbIn
                    } else if (IS.rec(val) && val.$ref) {
                        // if referencing proxy itself, return its quoted tableName
                        const proxyRef = trimEnd(val.$prefix, '.')
                        sb += proxyRef.includes('.')
                            ? proxyRef
                            : dialect.quoteTable(Meta.assert(val.$ref.cls).tableName)
                    } else if (IS.obj(val) && IS.fn(val.build)) {
                        // Merge params of SqlBuilder and append SQL
                        const frag = (val as SqlBuilder).build()
                        // Replace named params used in SQL Builders
                        const replaceParams = ['limit','offset']
                        if (Object.keys(frag.params).some(x => replaceParams.includes(x))) {
                            for (let orig of replaceParams) {
                                if (orig in frag.params) {
                                    let i = nextParamVal(frag.params)
                                    const p = '_' + i
                                    frag.params[p] = frag.params[orig]
                                    delete frag.params[orig]
                                    frag.sql = frag.sql.replaceAll(`$${orig}`, `$${p}`)
                                }
                            }
                        }
                        sb += mergeParams(sqlParams, frag).replaceAll('\n', '\n      ')
                    } else if (IS.obj(val) && IS.str(val.sql)) {
                        // Merge params of Sql Fragment and append SQL
                        const frag = val as Fragment
                        sb += mergeParams(sqlParams, frag).replaceAll('\n', '\n      ')
                    } else if (val) {
                        const paramIndex = Object.keys(sqlParams).length + 1
                        const name = `_${paramIndex}`
                        sb += `$${name}`
                        sqlParams[name] = val
                    }
                }
                return ({ sql:sb, params:sqlParams })
            } else if (IS.str(strings)) {
                return ({ sql:strings, params:params[0] })
            } else throw new Error(`sql(${typeof strings}) is invalid`)
        }
        $.schema = DriverRequiredProxy as Schema
        $.dialect = dialect
        $.quote = dialect.quote.bind(dialect)
        $.quoteColumn = dialect.quoteColumn.bind(dialect)
        $.quoteTable = dialect.quoteTable.bind(dialect)
    
        function quoteProp(meta:Meta, prop:string) {
            const c = meta.props.find(x => x.name == prop)?.column
            if (!c) throw new Error(`${meta.name} does not have a column property ${prop}`)
            return dialect.quoteColumn(c)
        }
        function unquotedProp(meta:Meta, prefix:string, key:string|Symbol) {
            const prop = IS.str(key) ? key : key.description!
            const c = meta.props.find(x => x.name == prop)?.column
            return !c
                ? (prefix ?? '') + prop
                : (prefix ?? '') + (c.alias ?? c.name)
        }
        $.ref = function<Table extends Constructor<any>>(cls:Table, as?:string) : TypeRef<InstanceType<Table>> {
            const meta = Meta.assert(cls)
            if (as == null)
                as = dialect.quoteTable(meta.tableName)
            const get = (target: { prefix:string, meta:Meta }, key:string|symbol) => key == '$ref' 
                ? { cls, as }
                : key == '$prefix' 
                    ? target.prefix
                    : meta.columns.find(x => x.name == key)?.type === 'OBJECT' || (target.prefix ?? '').indexOf('.') != (target.prefix ?? '').lastIndexOf('.')
                        ? new Proxy({ prefix: unquotedProp(meta, target.prefix, key) + '.', meta }, { get })
                        : Symbol(target.prefix + quoteProp(meta, IS.str(key) ? key : key.description!))
            const p = new Proxy({ prefix: as ? as + '.' : '', meta }, { get })
            return p as any as TypeRef<InstanceType<Table>>
        }
        $.refs = function refs<T extends readonly Constructor[]>(...classes: [...T]): ConstructorToTypeRef<T> {
            return classes.map(cls => $.ref(cls)) as ConstructorToTypeRef<T>
        }
        $.sql = function(sql:string|Fragment, params:Record<string,any>={}): Fragment {
            return IS.rec(sql)
                ? ({ sql: mergeParams(params, sql), params }) 
                : ({ sql, params })
        }

        $.from = function<Table extends Constructor<any>>(table:Table | TypeRef<InstanceType<Table>>, alias?:string) {
            const cls = asType(table)
            const ref = asRef(table) ?? $.ref(table, alias ?? '')
            return new SelectQuery<[Table]>($, [cls], [Meta.assert(cls)], [ref])
        }
        $.update = function<Table extends Constructor<any>>(table:Table) { 
            return new UpdateQuery<[Table]>($, [table], [Meta.assert(table)], [$.ref(table,'')]) 
        }
        $.deleteFrom = function<Table extends Constructor<any>>(table:Table) { 
            return new DeleteQuery<[Table]>($, [table], [Meta.assert(table)], [$.ref(table,'')]) 
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
        $.idEquals = function hasId<Table extends { id:number|string }>(id:number|string) {
            return (x:Table) => $.sql($`${x.id} = $id`, { id })
        }

        $.log = function(obj:any) { console.log(Inspect.dump(obj)) }
        $.dump = function(obj:any[]){ console.log(Inspect.dumpTable(obj)) }
    
        return $
    }
}

export class SqlJoinBuilder<Tables extends Constructor<any>[]> implements JoinBuilder<First<Tables>> {
    get table() { return this.tables[0] as First<Tables> }
    tables: Tables
    refs: ConstructorsToRefs<Tables>
    exprs:{ type:JoinType, expr:((refs:ConstructorsToRefs<Tables>) => Fragment) }[]=[]

    params:Record<string,any> = {}
    alias:string = ''
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
        if (this.alias) {
            refs[0] = this.$.ref(refs[0].$ref.cls, this.alias)
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
        const queryRefs = [] as ConstructorsToRefs<Tables>
        for (const table of this.tables) {
            const useRef = refs.find(x => x.$ref.cls === table) ?? this.$.ref(table)
            queryRefs.push(useRef)
        }

        for (const expr of this.exprs) {
            const result = expr(queryRefs)
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
