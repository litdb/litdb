import { Constructor, Fragment, JoinBuilder, TypeRef } from "./types"

export function padInt(n: number) { return n < 10 ? '0' + n : n }

export function isDate(d:any) { 
    return d && Object.prototype.toString.call(d) === "[object Date]" && !isNaN(d) 
}

export function toDate(s: string|any) { return !s ? null 
    : isDate(s)
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

export function nextParam(params:Record<string,any>) {
    const positionalParams = Object.keys(params).map(x => parseInt(x)).filter(x => !isNaN(x))
    return positionalParams.length == 0
        ? 1
        : Math.max(...positionalParams) + 1
}

export function mergeParams(params:Record<string,any>, f:Fragment) {
    let sql = f.sql
    if (f.params && typeof f.params == 'object') {
        for (const [key, value] of Object.entries(f.params)) {
            const exists = key in params && !isNaN(parseInt(key))
            if (exists) {
                const nextvalue = nextParam(params)
                sql = sql.replaceAll(`$${key}`,`$${nextvalue}`)
                params[nextvalue] = value
            } else {
                params[key] = value
            }
        }
    }
    return sql
}

export function asType<NewTable extends Constructor<any>>(cls:NewTable|JoinBuilder<NewTable>|TypeRef<InstanceType<NewTable>>) : NewTable {
    if (typeof cls != 'object' && typeof cls != 'function') throw new Error(`invalid argument: ${typeof cls}`)
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
    return typeof cls == 'object' && (cls as any).$ref ? cls as TypeRef<InstanceType<NewTable>> : undefined
}
