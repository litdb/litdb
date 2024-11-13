import { Constructor, Fragment, JoinBuilder, TypeRef } from "./types"

export class IS {
    /** Array.isArray */
    static arr(o:any):o is any[] {
        return Array.isArray(o)
    }
    /** typeof 'object' -> is Record<string, any> */
    static rec(o:any):o is Record<string, any> {
        return typeof o == 'object'
    }
    /** typeof 'object' -> is any */
    static obj(o:any):o is any {
        return typeof o == 'object'
    }
    /** typeof 'function' */
    static fn(o:any):o is Function { //((...args:any[]) => any)
        return typeof o == 'function'
    }
    /** typeof 'string' */
    static str(o:any):o is string {
        return typeof o == 'string'
    }
    /** typeof 'number' */
    static num(o:any):o is number {
        return typeof o == 'number'
    }
    /** typeof 'symbol' */
    static sym(o:any):o is symbol {
        return typeof o == 'symbol'
    }
    /** TemplateStringsArray */
    static tpl(o: any): o is TemplateStringsArray {
        return IS.arr(o) && 'raw' in o
    }
    /** is Date */
    static date(o:any): o is Date { 
        return o && Object.prototype.toString.call(o) === "[object Date]" && !isNaN(o) 
    }
}

export function padInt(n: number) { return n < 10 ? '0' + n : n }

export function toDate(s: string|any) { return !s ? null 
    : IS.date(s)
        ? s as Date 
        : s[0] == '/' 
            ? new Date(parseFloat(/Date\(([^)]+)\)/.exec(s)![1])) 
            : new Date(s)
}

export function toLocalISOString(d: Date = new Date()) {
    return `${d.getFullYear()}-${padInt(d.getMonth() + 1)}-${padInt(d.getDate())}T${padInt(d.getHours())}:${padInt(d.getMinutes())}:${padInt(d.getSeconds())}`
}

export function propsWithValues(obj:Record<string,any>) {
    return Object.keys(obj).filter(k => obj[k] != null)
}

export function uniqueKeys(rows:any[]) : string[] {
    let to:string[] = []
    rows.forEach(o => Object.keys(o).forEach(k => {
        if (to.indexOf(k) === -1) {
            to.push(k)
        }
    }))
    return to
}

export function pick<T extends Record<string, any> | Record<string, any>[]>(
    input: T,
    keys: string[]
) : T extends Record<string, any>[] ? Record<string, any>[] : Record<string, any> {
    if (Array.isArray(input)) {
        return input.map(item => 
        keys.reduce((obj, key) => ({
            ...obj,
            [key]: item[key]
        }), {})
        ) as any
    }
    return keys.reduce((obj, key) => ({
        ...obj,
        [key]: input[key]
    }), {}) as any
}
export function omit<T extends Record<string, any> | Record<string, any>[]>(
    input: T,
    keys: string[]
) : T extends Record<string, any>[] ? Record<string, any>[] : Record<string, any> {
    if (Array.isArray(input)) {
      return input.map(item => {
        const result = { ...item }
        keys.forEach(key => delete result[key])
        return result
      }) as Record<string, any>[]
    }
    
    const result = { ...input }
    keys.forEach(key => delete (result as any)[key])
    return result as T extends Record<string, any>[] ? Record<string, any>[] : Record<string, any>
}

export function leftPart(s:string, needle:string) {
    if (s == null) return null
    let pos = s.indexOf(needle)
    return pos == -1
        ? s
        : s.substring(0, pos)
}

export function toStr(value:any) {
    return typeof value == 'symbol'
        ? `:${value.description ?? ''}`
        : `${value}`
}

export function nextParam(params:Record<string,any>) { return '_' + nextParamVal(params) }
export function nextParamVal(params:Record<string,any>) {
    const positional = Object.keys(params)
        .map(x => x[0] === '_' ? parseInt(x.substring(1)) : NaN).filter(x => !isNaN(x))
    return (positional.length == 0
        ? 1
        : Math.max(...positional) + 1)
}

export function sortParamKeys(keys:string[]) {
    return keys.sort((a, b) => {
        // Check if both keys start with underscore followed by a number
        const aM = a.match(/^_(\d+)/)
        const bM = b.match(/^_(\d+)/)
        
        // If both have _number prefix, sort numerically
        if (aM && bM) return parseInt(aM[1]) - parseInt(bM[1])
        
        // If only one has _number prefix, put it first
        if (aM) return -1
        if (bM) return 1
        
        // Otherwise sort alphabetically
        return a.localeCompare(b)
    })
}

export function sortParams(o:Record<string,any>) {
    return sortParamKeys(Object.keys(o)).reduce((acc, k) => {
        acc[k] = o[k]
        return acc
    }, {} as Record<string,any>)
}

export function mergeParams(params:Record<string,any>, f:Fragment) {
    let sql = f.sql
    const conflicts = Object.keys(f.params).some((x:string) => x in params)
    if (!conflicts) {
        for (const [key, value] of Object.entries(f.params)) {
            params[key] = value
        }
        return sql
    }

    // create new param mappings
    const startIndex = nextParamVal(params)
    const newMap:Record<string,any> = {}
    let i = 0
    for (const key of Object.keys(f.params)) {
        newMap[key] = '_' + (startIndex + i++)
    }

    const toSql = sql.replace(/\$(\w+)/g, (_, name) => {
        const toVal = newMap[name]
        if (toVal) {
            params[toVal] = f.params[name]
        }
        return `$${toVal ?? name}`
    })
    return toSql
}

export function asType<NewTable extends Constructor<any>>(cls:NewTable|JoinBuilder<NewTable>|TypeRef<InstanceType<NewTable>>) : NewTable {
    if (!IS.obj(cls) && !IS.fn(cls)) throw new Error(`invalid argument: ${typeof cls}`)
    const ref = (cls as any).$ref
        ? cls as TypeRef<InstanceType<NewTable>>
        : undefined
    return !(cls as any)?.$ref && (cls as any).tables
        ? (cls as JoinBuilder<NewTable>).table
        : ref
            ? ref.$ref.cls
            : cls as NewTable
}
export function asRef<NewTable extends Constructor<any>>(cls:NewTable|JoinBuilder<NewTable>|TypeRef<InstanceType<NewTable>>) 
    : TypeRef<InstanceType<NewTable>>|undefined {
    return IS.obj(cls) && (cls as any).$ref ? cls as TypeRef<InstanceType<NewTable>> : undefined
}

export function snakeCase(s: string) { return (s || '').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase() }

export function clsName(name:string, ...args:string[]|{ name:string }[]|{ constructor:{ name:string} }[]) {
    if (!args || !args.length) return name
    const argName = (o:any) => IS.str(o)
        ? o
        : "name" in o 
            ? o.name
            : "constructor" in o && "name" in o.constructor
                ? o.constructor.name
                : ''
    return `${name}<${Array.from(args).map(argName).join(',')}>`
}

export function isQuoted(name:string) {
    return name && (name[0] == '"' || name[0] == '`')
}
