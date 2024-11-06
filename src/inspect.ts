import { toStr, uniqueKeys } from "./utils"

export function alignLeft(str:string, len:number, pad:string = ' ') : string {
    if (len < 0) return ''
    let aLen = len + 1 - str.length
    if (aLen <= 0) return str
    return pad + str + pad.repeat(len + 1 - str.length)
}
export function alignCenter(str:string, len:number, pad:string = ' ') : string {
    if (len < 0) return ''
    if (!str) str = ''
    let nLen = str.length
    let half = Math.floor(len / 2 - nLen / 2)
    let odds = Math.abs((nLen % 2) - (len % 2))
    return pad.repeat(half + 1) + str + pad.repeat(half + 1 + odds)
}
export function alignRight(str:string, len:number, pad:string = ' ') : string {
    if (len < 0) return ''
    let aLen = len + 1 - str.length
    if (aLen <= 0) return str
    return pad.repeat(len + 1 - str.length) + str + pad
}
export function alignAuto(obj:any, len:number, pad:string = ' ') : string {
    let str = `${obj}`
    if (str.length <= len) {
    return  typeof obj === "number"
        ? alignRight(str, len, pad)
        : alignLeft(str, len, pad)
    }
    return str
}

export class Inspect {
  
    static dump(obj:any) : string {
        if (typeof obj == "object") {
            if (typeof obj.build == "function") {
                obj = obj.build()
            }
            if ("sql" in obj && "params" in obj) {
                return [obj.sql, `PARAMS ${Inspect.dump(obj.params)}`].join('\n') + '\n'
            }
        }
        let to = JSON.stringify(obj, null, 4)
        return to.replace(/\\"/g,'')
    }
  
    static printDump(obj:any) { console.log(Inspect.dump(obj)) }
  
    static dumpTable(rows:any[]) : string {
        let mapRows = rows
        let keys = uniqueKeys(mapRows)
        let colSizes:{[index:string]:number} = {}

        keys.forEach(k => {
            let max = k.length
            mapRows.forEach(row => {
                let col = row[k]
                if (col != null) {
                    let valSize = `${col}`.length
                    if (valSize > max) {
                        max = valSize
                    }
                }
            })
            colSizes[k] = max
        })

        // sum + ' padding ' + |
        let colSizesLength = Object.keys(colSizes).length
        let rowWidth = Object.keys(colSizes).map(k => colSizes[k]).reduce((p, c) => p + c, 0) +
            (colSizesLength * 2) +
            (colSizesLength + 1)
        let sb:string[] = []
        sb.push(`+${'-'.repeat(rowWidth - 2)}+`)
        let head = '|'
        keys.forEach(k => head += alignCenter(k, colSizes[k]) + '|')
        sb.push(head)
        sb.push(`|${'-'.repeat(rowWidth - 2)}|`)

        mapRows.forEach(row => {
            let to = '|'
            keys.forEach(k => to += '' + alignAuto(row[k], colSizes[k]) + '|')
            sb.push(to)
        })
        sb.push(`+${'-'.repeat(rowWidth - 2)}+`)

        return sb.join('\n')
    }
  
    static printDumpTable(rows:any[]) { console.log(Inspect.dumpTable(rows)) }
}

export function Watch(fn:(() => Record<string,any>)|(() => void)) {
    try {

        const results = fn()
        if (!results) return
        for (const key in results) {
            console.log(`${key}:`)
            const val = results[key]
            if (Array.isArray(val)) {
                console.table(val)
            } else {
                if (typeof val != "object")
                    console.log(toStr(val).trim())
                else
                    console.log(Inspect.dump(val))
            }
            console.log()
        }

    } catch(e) {
        console.error(`${e}`)
    }
}