import { ReflectMeta } from "./types"

export class Meta {
    constructor(public cls:ReflectMeta) {
        if (!cls) throw new Error(`Class must be provided`)
        if (!cls.$type) throw new Error(`Class ${cls.name ?? cls} have a $type property`)
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
