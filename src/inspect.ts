import { uniqueKeys } from "./utils"

function alignLeft(str:string, len:number, pad:string = ' ') : string {
    if (len < 0) return ''
    let aLen = len + 1 - str.length
    if (aLen <= 0) return str
    return pad + str + pad.repeat(len + 1 - str.length)
}
function alignCenter(str:string, len:number, pad:string = ' ') : string {
    if (len < 0) return ''
    if (!str) str = ''
    let nLen = str.length
    let half = Math.floor(len / 2 - nLen / 2)
    let odds = Math.abs((nLen % 2) - (len % 2))
    return pad.repeat(half + 1) + str + pad.repeat(half + 1 + odds)
}
function alignRight(str:string, len:number, pad:string = ' ') : string {
    if (len < 0) return ''
    let aLen = len + 1 - str.length
    if (aLen <= 0) return str
    return pad.repeat(len + 1 - str.length) + str + pad
}
function alignAuto(obj:any, len:number, pad:string = ' ') : string {
    let str = `${obj}`
    if (str.length <= len) {
    return  typeof obj === "number"
        ? alignRight(str, len, pad)
        : alignLeft(str, len, pad)
    }
    return str
}

export class Inspect {
  
    static dump(obj:any) {
        let to = JSON.stringify(obj, null, 4)
        return to.replace(/"/g,'')
    }
  
    static printDump(obj:any) { console.log(Inspect.dump(obj)) }
  
    static dumpTable(rows:any[]) {
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
