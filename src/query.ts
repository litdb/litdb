import type { 
    Constructor, ConstructorsToRefs, ConstructorToTypeRef, Driver, Fragment, 
    GroupByBuilder, HavingBuilder, OrderByBuilder, TypeRef 
} from "./types"
import { Meta, Schema } from "./connection"
import { SqlJoinBuilder } from "./builders/where"
import { mergeParams } from "./utils"

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

    public static create(driver:Driver) {
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
                        sb += driver.quoteTable(Schema.assertMeta(value.$ref.cls).tableName)
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
    
        function quote(meta:Meta, prop:string) {
            const p = meta.props.find(x => x.name == prop)?.column
            if (!p) throw new Error(`${meta.name} does not have a column property ${prop}`)
            return driver.quoteColumn(p.name)
        }
        $.ref = function<Table extends Constructor<any>>(cls:Table, as?:string) : TypeRef<InstanceType<Table>> {
            const meta = Schema.assertMeta(cls)
            if (as == null)
                as = driver.quoteTable(meta.tableName)
            const get = (target: { prefix:string, meta:Meta }, key:string|symbol) => key == '$ref' 
                ? { cls, as }
                : Symbol(target.prefix + quote(meta, typeof key == 'string' ? key : key.description!))
            const p = new Proxy({ prefix: as ? as + '.' : '', meta }, { get })
            return p as any as TypeRef<InstanceType<Table>>
        }
        $.refs = function refs<T extends readonly Constructor[]>(...classes: [...T]): ConstructorToTypeRef<T> {
            return classes.map(cls => $.ref(cls)) as ConstructorToTypeRef<T>
        }
        $.join = function<Tables extends Constructor<any>[]>(...tables:Tables) {
            return new SqlJoinBuilder<Tables>(driver, ...tables)
        }
        $.groupBy = function<Tables extends Constructor<any>[]>(...tables:Tables) {
            return new SqlGroupByBuilder<Tables>(driver, ...tables)
        }
        $.having = function<Tables extends Constructor<any>[]>(...tables:Tables) {
            return new SqlHavingBuilder<Tables>(driver, ...tables)
        }
        $.orderBy = function<Tables extends Constructor<any>[]>(...tables:Tables) {
            return new SqlOrderByBuilder<Tables>(driver, ...tables)
        }
    
        return $
    }
}

export class SqlBuilderBase<Tables extends Constructor<any>[]> {
    $:ReturnType<typeof Sql.create>

    tables:Tables
    params:Record<string,any> = {}
    exprs:((refs:ConstructorsToRefs<Tables>) => Fragment)[]=[]

    constructor(public driver:Driver, ...tables:Tables) {
        this.$ = driver.$ as ReturnType<typeof Sql.create>
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
        const sql = sqls.join(', ')
        return { sql, params }
    }
}

export class SqlGroupByBuilder<Tables extends Constructor<any>[]> extends SqlBuilderBase<Tables> implements GroupByBuilder {}
export class SqlHavingBuilder<Tables extends Constructor<any>[]> extends SqlBuilderBase<Tables> implements HavingBuilder {}
export class SqlOrderByBuilder<Tables extends Constructor<any>[]> extends SqlBuilderBase<Tables> implements OrderByBuilder {}
