import type { 
  Driver, Connection, SyncConnection, DbBinding, Statement, SyncStatement, Fragment, TableDefinition, ColumnDefinition, 
  TypeConverter, NamingStrategy, SqlBuilder, ReflectMeta, Dialect, DialectTypes, ColumnType, Changes,
} from "./types"
import { DbConnection, SyncDbConnection, DefaultStrategy, SnakeCaseStrategy, useFilter } from "./connection"
import { WhereQuery, SelectQuery, UpdateQuery, DeleteQuery, } from "./sql.builders"
import { Sql } from "./sql"
import { Meta } from "./meta"
import { Schema } from "./schema"
import { Inspect } from "./inspect"
import { pick, omit, toStr, mergeParams, nextParam, snakeCase, isTemplateStrings } from "./utils"
import { converterFor, DateTimeConverter } from "./converters"
import { table, column, Table, DefaultValues, DataType, } from "./model"
import { Sqlite } from "./sqlite/driver"
import { SqliteDialect } from "./sqlite/dialect"
import { MySql } from "./mysql/driver"
import { MySqlDialect } from "./mysql/dialect"
import { PostgreSql } from "./postgres/driver"
import { PostgreSqlDialect } from "./postgres/dialect"
import { SqliteSchema } from "./sqlite/schema"
import { MySqlSchema } from "./mysql/schema"
import { PostgreSqlSchema } from "./postgres/schema"

const sqlite = (() => { return Sqlite.init().$ })()
const mysql = (() => { return MySql.init().$ })()
const postgres = (() => { return PostgreSql.init().$ })()

export { 
  Sql,
  Meta,
  Schema,
  Driver,
  Connection, 
  SyncConnection,
  DbConnection,
  SyncDbConnection,
  NamingStrategy,
  SqlBuilder,
  ReflectMeta,
  Dialect,
  DialectTypes, 
  ColumnType,
  Changes,
  DefaultStrategy,
  SnakeCaseStrategy,
  useFilter,
  WhereQuery,
  SelectQuery,
  UpdateQuery,
  DeleteQuery,
  Inspect,
  DateTimeConverter,
  converterFor,
  table,
  column,
  Table,
  DefaultValues,
  DataType,
  ColumnDefinition, DbBinding, Statement, SyncStatement, Fragment, TableDefinition, TypeConverter,
  Sqlite, SqliteDialect, SqliteSchema,             sqlite,
  MySql, MySqlDialect, MySqlSchema,                mysql,
  PostgreSql, PostgreSqlDialect, PostgreSqlSchema, postgres,
  pick, omit, toStr, mergeParams, nextParam, snakeCase, isTemplateStrings,
}
