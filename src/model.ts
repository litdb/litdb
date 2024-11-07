import { ColumnConfig, ColumnType, Constructor, FluentTableDefinition } from "./types";
import { IS } from "./utils";

// @table annotation
export function table(options?: {
    alias?: string
}) {
    return function (target: any) {
        const table =  Object.assign({}, options, { name:options?.alias ?? target.name });
        if (!target.$id) target.$id = Symbol(target.name)
        target.$type ??= { name:target.name }
        target.$type.table = table
    }
}

// @column annotation
export function column(type:ColumnType|symbol, options?: ColumnConfig) {
    return function (target: any, propertyKey: string) {
        const column = Object.assign({}, options, { type:type, name:options?.alias ?? propertyKey })
        if (propertyKey === 'id' || options?.autoIncrement) column.primaryKey = true
        if (!target.constructor.$id) target.constructor.$id = Symbol(target.constructor.name)
        const props = (target.constructor.$props ?? (target.constructor.$props=[]))
        let prop = props.find((x:any) => x.name === propertyKey)
        if (!prop) {
            prop = { name:propertyKey }
            props.push(prop)
        }
        prop.column = column
        if (IS.sym(prop.column.type)) {
            prop.column.type = (prop.column.type as symbol).description
        }
    }
}

// Fluent definition to apply @column and @table to any JS class
export function Table<T extends Constructor<any>>(cls:T, definition: FluentTableDefinition<T>) {
    if (!definition) throw new Error('Table definition is required')

    const meta = cls as any
    if (!meta.$id) meta.$id = Symbol(cls.name)
    // Set the table name and alias if provided
    meta.$type ??= { name:cls.name }
    meta.$type.table = definition.table ?? { }
    meta.$type.table.name ??= cls.name
    const props = (meta.$props ?? (meta.$props=[]))
    Object.keys(definition.columns).forEach(name => {
        const column = (definition.columns as any)[name]
        if (!column) throw new Error(`Column definition for ${name} is missing`)
        if (!column.type) throw new Error(`Column type for ${name} is missing`)
        if (name === 'id' || column?.autoIncrement) column.primaryKey = true
        let prop = props.find((x:any) => x.name === name)
        if (!prop) {
             prop = { name }
             props.push(prop)
        }
        prop.column = column
        prop.column.name ??= column.alias ?? name
        if (IS.sym(prop.column.type)) {
            prop.column.type = (prop.column.type as symbol).description
        }
    })
    return cls
}

// Constants that can be substituted per RDBMS Driver
export const DefaultValues = {
    NOW: '{NOW}',
    MAX_TEXT: '{MAX_TEXT}',
    MAX_TEXT_UNICODE: '{MAX_TEXT_UNICODE}',
    TRUE: '{TRUE}',
    FALSE: '{FALSE}',
}
