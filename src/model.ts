import { ColumnConfig, ColumnType, Constructor, FluentTableDefinition } from "./types";
import { IS } from "./utils";

// @table annotation
export function table(opt?: {
    alias?: string
}) {
    return function (target: any) {
        const table =  Object.assign({}, opt, { name:opt?.alias ?? target.name });
        if (!target.$id) target.$id = Symbol(target.name)
        target.$type ??= { name:target.name }
        target.$type.table = table
    }
}

// @column annotation
export function column(type:ColumnType|symbol, opt?: ColumnConfig) {
    return function (target: any, propKey: string) {
        const col = Object.assign({}, opt, { type:type, name:opt?.alias ?? propKey })
        if (propKey === 'id' || opt?.autoIncrement) col.primaryKey = true
        if (!target.constructor.$id) target.constructor.$id = Symbol(target.constructor.name)
        const props = (target.constructor.$props ?? (target.constructor.$props=[]))
        let p = props.find((x:any) => x.name === propKey)
        if (!p) {
            p = { name:propKey }
            props.push(p)
        }
        p.column = col
        if (IS.sym(p.column.type)) {
            p.column.type = (p.column.type as symbol).description
        }
    }
}

// Fluent definition to apply @column and @table to any JS class
export function Table<T extends Constructor<any>>(cls:T, def: FluentTableDefinition<T>) {
    if (!def) throw new Error('Table definition is required')

    const M = cls as any
    if (!M.$id) M.$id = Symbol(cls.name)
    // Set the table name and alias if provided
    M.$type ??= { name:cls.name }
    M.$type.table = def.table ?? { }
    M.$type.table.name ??= cls.name
    const props = (M.$props ?? (M.$props=[]))
    Object.keys(def.columns ?? {}).forEach(name => {
        const col = (def.columns as any)[name]
        if (!col) throw new Error(`Column definition for ${name} is missing`)
        if (!col.type) throw new Error(`Column type for ${name} is missing`)
        if (name === 'id' || col?.autoIncrement) col.primaryKey = true
        let p = props.find((x:any) => x.name === name)
        if (!p) {
             p = { name }
             props.push(p)
        }
        p.column = col
        p.column.name ??= col.alias ?? name
        if (IS.sym(p.column.type)) {
            p.column.type = (p.column.type as symbol).description
        }
    })
    return cls
}

// Constants that can be substituted per RDBMS Driver
export const DefaultValues = {
    NOW: '{NOW}',
    MAX_TEXT: '{MAX_TEXT}',
    TRUE: '{TRUE}',
    FALSE: '{FALSE}',
}
