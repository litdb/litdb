import { ClassParam, ReflectMeta } from "./types"

export const type = Symbol('type')

export class Meta {
    static metadata: { [id:symbol]: Meta } = {}

    constructor(public cls:ReflectMeta) {
        if (!cls) throw new Error(`Class must be provided`)
        if (!cls.$type) throw new Error(`Class ${cls.name ?? cls} have a $type property`)
    }

    static assertClass(table:ClassParam) : ReflectMeta {
        if (!table)
            throw new Error(`Class must be provided`)
        const cls = ( (table?.constructor as any)?.$id
            ? table?.constructor
            : (table as any).$id ? table : null) as ReflectMeta
        if (!cls) {
            const name = (table as any)?.name ?? table?.constructor?.name
            if (!name)
                throw new Error(`Class or constructor function required`)
            else if (typeof table === 'function' || typeof table.constructor === 'function') 
                throw new Error(`${name} is not a class or constructor function`)
            else
                throw new Error(`${name} does not contain metadata, missing @table?`)            
        }
        return cls
    }

    static assertTable(table:ClassParam) : ReflectMeta {
        const cls = Meta.assertClass(table)
        if (!cls.$type?.table) {
            throw new Error(`${cls.name} does not have a @table annotation`)
        }
        if (!cls.$props || !cls.$props.find((x:any) => x.column!!)) {
            throw new Error(`${cls.name} does not have any @column annotations`)
        }
        return cls as ReflectMeta
    }

    static assertMeta(table:ClassParam) : Meta {
        const cls = Meta.assertClass(table)
        const id = cls.$id as symbol
        return Meta.metadata[id] ?? (Meta.metadata[id] = new Meta(Meta.assertTable(cls)))
    }

    get name() { return this.cls.$type?.name ?? this.cls.name }

    get tableName() {
        const cls = this.cls
        const ret = cls.$type?.table?.alias ?? cls.$type?.name ?? cls.name 
        if (!ret) throw new Error(`Table name not found for ${cls.name}`)
        return ret
    }

    get type() { return this.cls.$type }
    get table() { 
        const ret = this.type.table
        if (!ret) throw new Error(`Table definition not found for ${this.cls.name}`)
        return ret
    }
    get props() { 
        return this.cls.$props ?? [] 
    }
    get columns() { 
        return this.props.filter(x => x.column).map(x => x.column!!)
    }
}
