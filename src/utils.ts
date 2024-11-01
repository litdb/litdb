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

export function toStr(value:any) {
    return typeof value == 'symbol'
        ? `:${value.description ?? ''}`
        : `${value}`
}
