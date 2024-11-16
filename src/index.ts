import type { 
  Driver, Connection, SyncConnection, DbBinding, Statement, SyncStatement, Fragment, TableDefinition, ColumnDefinition, 
  TypeConverter, NamingStrategy, SqlBuilder, ReflectMeta, Dialect, DialectTypes, ColumnType, Changes, Constructor,
} from "./types"
import { DbConnection, SyncDbConnection, ConnectionBase, DefaultStrategy, SnakeCaseStrategy, useFilter, useFilterSync } from "./connection"
import { WhereQuery, SelectQuery, UpdateQuery, DeleteQuery, } from "./sql.builders"
import { Sql } from "./sql"
import { Meta } from "./meta"
import { Schema } from "./schema"
import { Inspect, Watch } from "./inspect"
import { converterFor, DateTimeConverter } from "./converters"
import { table, column, Table, DefaultValues, } from "./model"
import { Sqlite, SqliteTypes } from "./sqlite/driver"
import { SqliteDialect } from "./sqlite/dialect"
import { MySql, MySqlTypes } from "./mysql/driver"
import { MySqlDialect } from "./mysql/dialect"
import { PostgreSql, PostgreSqlTypes } from "./postgres/driver"
import { PostgreSqlDialect } from "./postgres/dialect"
import { SqliteSchema } from "./sqlite/schema"
import { MySqlSchema } from "./mysql/schema"
import { PostgreSqlSchema } from "./postgres/schema"
import { 
  IS, pick, omit, toStr, mergeParams, nextParam, nextParamVal, sortParams, snakeCase, asType, asRef,
  pad, toDate, dateISOString, uniqueKeys,
} from "./utils"

const sqlite = (() => { return Sqlite.init().$ })()
const mysql = (() => { return MySql.init().$ })()
const postgres = (() => { return PostgreSql.init().$ })()

export { 
  Driver, Connection, SyncConnection, DbBinding, Statement, SyncStatement, Fragment, TableDefinition, ColumnDefinition, 
  TypeConverter, NamingStrategy, SqlBuilder, ReflectMeta, Dialect, DialectTypes, ColumnType, Changes, Constructor,
  Sql,
  Meta,
  Schema,
  DbConnection, SyncDbConnection, ConnectionBase, DefaultStrategy, SnakeCaseStrategy, useFilter, useFilterSync,
  WhereQuery,
  SelectQuery,
  UpdateQuery,
  DeleteQuery,
  Inspect,
  Watch,
  DateTimeConverter,
  converterFor,
  table,
  column,
  Table,
  DefaultValues,
  Sqlite, SqliteDialect, SqliteSchema, SqliteTypes,                 sqlite,
  MySql, MySqlDialect, MySqlSchema, MySqlTypes,                     mysql,
  PostgreSql, PostgreSqlDialect, PostgreSqlSchema, PostgreSqlTypes, postgres,
  IS, pick, omit, toStr, mergeParams, nextParam, nextParamVal, sortParams, snakeCase, asType, asRef,
  pad, toDate, dateISOString, uniqueKeys,
}
