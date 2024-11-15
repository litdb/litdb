import type { TypeConverter } from "./types"
import { toDate } from "./utils"

export function converterFor(converter:TypeConverter, ...dataTypes:string[]) {
    const to : { [key: string]: TypeConverter } = {}
    for (const type of dataTypes) { 
        to[type] = converter
    }
    return to
}

export class DateTimeConverter implements TypeConverter
{
    toDb(value: any) {
        const d = toDate(value)
        return d ? d.toISOString() : null
    }
    fromDb(value: any) {
        if (!value) return null
        return toDate(value)
    }
}
