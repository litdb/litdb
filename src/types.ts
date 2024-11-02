import { Connection, SyncConnection } from "./connection";

export type ConstructorsToRefs<T extends Constructor<any>[]> = {
    [K in keyof T]: TypeRef<InstanceType<T[K]>>
}

export type First<T extends readonly any[]> = T extends [infer F, ...any[]] 
    ? F extends Constructor<any> 
        ? F 
        : never 
    : never;

export type Last<T extends readonly any[]> = T extends [...any[], infer L] 
    ? L extends Constructor<any> 
        ? L 
        : never 
    : never;

export type LastN<T extends any[], N extends number> = T extends [...any[], ...infer U] 
  ? U['length'] extends N 
    ? U 
    : never 
  : never

export type Params = Record<string, any> | any[];

export type ScalarValue = 
    | string
    | bigint
    | number
    | boolean
    | null
    | symbol
export type DbBinding =
    | string
    | bigint
    | NodeJS.TypedArray
    | number
    | boolean
    | null
    | Record<
        string,
        string | bigint | NodeJS.TypedArray | number | boolean | null>;

export interface ReflectMeta {
    name: string
    $id: symbol
    $type: { name:string, table?:TableDefinition }
    $props: [{ name:string, column?:ColumnDefinition }]
}

export type ColumnType = 'INTEGER' | 'SMALLINT' | 'BIGINT'
    | 'DECIMAL' | 'NUMERIC' | 'REAL' | 'FLOAT' | 'DOUBLE' | 'MONEY'
    | 'DATE' | 'DATETIME' | 'TIME' | 'TIMEZ' | 'TIMESTAMP' | 'TIMESTAMPZ'
    | 'INTERVAL' | 'BOOLEAN'
    | 'UUID' | 'BLOB' | 'BYTES' | 'BIT'
    | 'TEXT' | 'VARCHAR' | 'NVARCHAR' | 'CHAR' | 'NCHAR' | 'JSON' | 'JSONB' | 'XML'

export type Constructor<T = any> = new (...args: any[]) => T
export type ConstructorWithParams<T, P extends any[]> = new (...args: P) => T

// Helper type to convert tuple of constructors to tuple of instances
export type ConstructorToInstances<T> = {
    [K in keyof T]: T[K] extends Constructor<infer U> ? U : never;
};

export type ClassParam = ReflectMeta | { constructor:ReflectMeta } | Constructor<any>
export type ClassInstance = { constructor:ReflectMeta } & Record<string, any> | Record<string, any>

export interface TableDefinition {
    name: string
    alias?: string
}

export interface ColumnDefinition {
    name: string
    alias?: string
    type: string
    primaryKey?: boolean
    autoIncrement?: boolean
    required?: boolean
    precision?: number
    scale?: number
    unique?: boolean
    index?: boolean
    defaultValue?: string
}

export interface Statement<ReturnType, ParamsType extends DbBinding[]> {
    get native():any

    all(...params: ParamsType): Promise<ReturnType[]>
    allSync(...params: ParamsType): ReturnType[]
    first(...params: ParamsType): Promise<ReturnType | null>
    firstSync(...params: ParamsType): ReturnType | null

    column<ReturnValue>(...params: ParamsType): Promise<ReturnValue[]>
    columnSync<ReturnValue>(...params: ParamsType): ReturnValue[]

    scalar<ReturnValue>(...params: ParamsType): Promise<ReturnValue | null>
    scalarSync<ReturnValue>(...params: ParamsType): ReturnValue | null

    arrays(...params: ParamsType): Promise<any[][]>
    arraysSync(...params: ParamsType): any[][]
    array(...params: ParamsType): Promise<any[] | null>
    arraySync(...params: ParamsType): any[] | null

    exec(...params: ParamsType): Promise<{ changes: number; lastInsertRowid: number | bigint; }>
    execSync(...params: ParamsType): { changes: number; lastInsertRowid: number | bigint; }
}

export interface NamingStrategy {
    schemaName(schema:string) : string
    tableName(table:string) : string
    columnName(column:string) : string
    schemaFromDef(def:TableDefinition) : string | undefined
    tableFromDef(def:TableDefinition) : string
}

export interface TypeConverter {
    toDb(value: any): any;
    fromDb(value: any): any;
}

export interface DbRow {
    table: string
    keys: string[]
    values: { [key: string]: any }
}

export interface Driver
{
    get $(): any

    get name(): string
    
    get async(): Connection
    
    get sync(): SyncConnection | undefined

    get converters(): { [key: string]: TypeConverter }

    quote(name: string): string
    
    quoteTable(name: string): string

    quoteColumn(name: string): string

    sqlColumnDefinition(column: ColumnDefinition): string

    sqlIndexDefinition(table: TableDefinition, column: ColumnDefinition): string

    sqlTableNames(schema?: string): string

    sqlLimit(skip?: number, take?: number): Fragment

    prepareRaw<ReturnType, ParamsType extends DbBinding[]>(sql:String) 
        : Statement<ReturnType, ParamsType extends any[] ? ParamsType : [ParamsType]>
    
    prepare<ReturnType, ParamsType extends DbBinding[]>(strings: TemplateStringsArray, ...params: DbBinding[])
        : Statement<ReturnType, ParamsType extends any[] ? ParamsType : [ParamsType]>
}

export type Fragment = { sql:string, params?:Record<string,any> }

export interface SqlBuilder {
    build(): { sql:string, params:Record<string,any>, into?:Constructor<any> }
}

export type WhereOptions = { 
    equals?:     Record<string,ScalarValue>
    notEquals?:  Record<string,ScalarValue>
    like?:       Record<string,ScalarValue>
    notLike?:    Record<string,ScalarValue>
    startsWith?: Record<string,ScalarValue>
    endsWith?:   Record<string,ScalarValue>
    contains?:   Record<string,ScalarValue>
    in?:         Record<string,ScalarValue[]>
    notIn?:      Record<string,ScalarValue[]>
    isNull?:     string[]
    notNull?:    string[]
    op?:         [string, Record<string,any>]
    sql?:        Fragment|Fragment[] 
    rawSql?:     string|string[]
    params?:     Record<string,any>
}

export type GroupByOptions = {

}

export type TypeRef<T> = T & { $ref: { cls:Constructor<T>, as?:string } }

export type ConstructorToTypeRef<T extends readonly any[]> = {
    [K in keyof T]: T[K] extends new (...args: any[]) => infer R 
        ? TypeRef<R>
        : never;
}

export type JoinType = "JOIN" | "INNER JOIN" | "LEFT JOIN" | "RIGHT JOIN" | "OUTER JOIN" | "FULL JOIN" | "CROSS JOIN"

export type TypeRefs<Tables extends Constructor<any>[]> = {
    [K in keyof Tables]: TypeRef<InstanceType<Tables[K]>>
}

export type JoinParams = { 
    on?:string | ((...params:any[]) => Fragment),
    as?:string
    params?:Record<string,any>
}

export type JoinDefinition = { 
    type:JoinType
    on?:string 
    params?:Record<string,any> 
}

export interface JoinBuilder<Table extends Constructor<any>> {
    get table(): Table
    get tables(): Constructor<any>[]
    build(refs:ConstructorsToRefs<any>, type:JoinType) : JoinDefinition
}

export interface GroupByBuilder {
    build(refs:ConstructorsToRefs<any>) : Fragment
}

export interface HavingBuilder {
    build(refs:ConstructorsToRefs<any>) : Fragment
}

export interface OrderByBuilder {
    build(refs:ConstructorsToRefs<any>) : Fragment
}
