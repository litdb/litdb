import type { Constructor, ConstructorToTypeRef, Driver, Fragment, TypeRef } from "./types"
import { Meta, Schema } from "./connection"
import { SqlJoinBuilder } from "./builders/where"

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
        $.join = function<JoinTables extends Constructor<any>[]>(...joinTables:JoinTables) {
            return new SqlJoinBuilder<JoinTables>(driver, ...joinTables)
        }
    
        return $
    }
}
