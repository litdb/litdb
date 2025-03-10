import { Schema } from "./schema"

export type Constructor<T = any> = new (...args: any[]) => T
export type ConstructorWithParams<T, P extends any[]> = new (...args: P) => T

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

// Helper type to convert tuple of constructors to tuple of instances
export type ConstructorToInstances<T> = {
    [K in keyof T]: T[K] extends Constructor<infer U> ? U : never;
}

export type Params = Record<string, any> | any[];

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
    | 'TEXT' | 'VARCHAR' | 'NVARCHAR' | 'CHAR' | 'NCHAR' | 'JSON' | 'JSONB' | 'XML' | 'OBJECT'

export type DialectTypes = {
    native: ColumnType[]
    map:    Record<string,ColumnType[]>
}

export type ClassParam = ReflectMeta | { constructor:ReflectMeta } | Constructor<any>
export type ClassInstance = { constructor:ReflectMeta } & Record<string, any> | Record<string, any>

export type ArrayToElementType<T extends readonly any[]> = T extends readonly (infer U)[] ? U : never;

export type TypeRef<T> = T & { $ref: { cls:Constructor<T>, as?:string } }

export type ConstructorToTypeRef<T extends readonly any[]> = {
    [K in keyof T]: T[K] extends new (...args: any[]) => infer R 
        ? TypeRef<R>
        : never;
}

export type ConstructorsToRefs<T extends Constructor<any>[]> = {
    [K in keyof T]: TypeRef<InstanceType<T[K]>>
}

export type TypeRefs<Tables extends Constructor<any>[]> = {
    [K in keyof Tables]: TypeRef<InstanceType<Tables[K]>>
}

export interface TableConfig {
    alias?: string
}

export interface TableDefinition extends TableConfig {
    name: string
}

export interface ColumnConfig {
    alias?: string
    primaryKey?: boolean
    autoIncrement?: boolean
    required?: boolean
    precision?: number
    scale?: number
    unique?: boolean
    index?: boolean
    defaultValue?: string
    references?: ColumnReference
}

export interface ColumnReference { 
    table:Constructor<any>|[Constructor<any>, string|string[]]
    on?:["DELETE"|"UPDATE", "NO ACTION"|"RESTRICT"|"SET NULL"|"SET DEFAULT"|"CASCADE"] 
}

export interface ColumnDefinition extends ColumnConfig {
    name: string
    type: string
}

// Table configuration interface
export interface FluentTableDefinition<T extends Constructor<any>> {
    table?: TableConfig
    columns: ColumnsConfig<InstanceType<T>>
}

// Helper type to ensure all properties in columns are keys of T
type ColumnsConfig<T> = {
    [K in keyof Partial<T>]: ColumnConfig & { type: ColumnType|symbol }
}

export type Changes = { changes: number; lastInsertRowid: number | bigint }

export interface Statement<RetType, ParamsType extends DbBinding[]> {
    get native():any
    all(...params: ParamsType): Promise<RetType[]>
    one(...params: ParamsType): Promise<RetType | null>
    value<ReturnValue>(...params: ParamsType): Promise<ReturnValue | null>
    arrays(...params: ParamsType): Promise<any[][]>
    array(...params: ParamsType): Promise<any[] | null>
    exec(...params: ParamsType): Promise<Changes>
    run(...params: ParamsType): Promise<void>
}

export interface SyncStatement<RetType, ParamsType extends DbBinding[]> {
    get native():any
    as<T extends Constructor<any>>(t:T) : SyncStatement<T, ParamsType>
    allSync(...params: ParamsType): RetType[]
    oneSync(...params: ParamsType): RetType | null
    valueSync<ReturnValue>(...params: ParamsType): ReturnValue | null
    arraysSync(...params: ParamsType): any[][]
    arraySync(...params: ParamsType): any[] | null
    execSync(...params: ParamsType): Changes
    runSync(...params: ParamsType): void
}

export interface TypeConverter {
    toDb(value: any): any;
    fromDb(value: any): any;
}

export interface NamingStrategy {
    tableName(table:string) : string
    columnName(column:string) : string
}

// Minimum interface required to use QueryBuilder
export interface Dialect {
    
    get $(): any

    strategy: NamingStrategy

    quote(name: string): string

    quoteTable(name: string|TableDefinition): string

    quoteColumn(name: string|ColumnDefinition): string

    sqlLimit(skip?: number, take?: number): Fragment
}

export interface Driver
{
    get dialect(): Dialect

    get schema(): Schema
}
    
export interface Connection {
    driver:Driver
    /**
     * Prepare a parameterized statement and return an async Statement
     */
    prepare<RetType, ParamsType extends DbBinding[]>(sql:TemplateStringsArray|string, ...params: DbBinding[])
        : Statement<RetType, ParamsType extends any[] ? ParamsType : [ParamsType]>

    close:() => Promise<void>
}

export interface SyncConnection {
    driver:Driver
    /**
     * Prepare a parameterized statement and return a sync Statement
     */
    prepareSync<RetType, ParamsType extends DbBinding[]>(sql:TemplateStringsArray|string, ...params: DbBinding[])
        : SyncStatement<RetType, ParamsType extends any[] ? ParamsType : [ParamsType]>

    closeSync:() => void
}

export type Fragment = { sql:string, params:Record<string,any> }
export type IntoFragment<T> = Fragment & { into:T }

export interface SqlBuilder {
    build(): Fragment
}

export type WhereOptions<T extends object> = {
    equals?:     { [K in keyof T]?: T[K] }
    notEquals?:  { [K in keyof T]?: T[K] }
    like?:       { [K in keyof T]?: T[K] }
    notLike?:    { [K in keyof T]?: T[K] }
    startsWith?: { [K in keyof T]?: T[K] }
    endsWith?:   { [K in keyof T]?: T[K] }
    contains?:   { [K in keyof T]?: T[K] }
    in?:         { [K in keyof T]?: T[K][] }
    notIn?:      { [K in keyof T]?: T[K][] }
    isNull?:     (keyof T)[]
    notNull?:    (keyof T)[]
    op?:         [string, { [K in keyof T]?: T[K] }]
    rawSql?:     string|string[]
    params?:     Record<string,any>
}

export type JoinType = "JOIN" | "INNER JOIN" | "LEFT JOIN" | "RIGHT JOIN" | "OUTER JOIN" | "FULL JOIN" | "CROSS JOIN"

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
    alias?:string
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
