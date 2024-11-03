import type { 
  ColumnDefinition, Driver, DbBinding, Statement, SyncStatement, Fragment, TableDefinition, 
  TypeConverter, NamingStrategy, SqlBuilder, ReflectMeta, Dialect, DialectTypes, ColumnType,
} from "./types"
import { Connection, ConnectionBase, DefaultStrategy, SnakeCaseStrategy, SyncConnection } from "./connection"
import { WhereQuery, SelectQuery, UpdateQuery, DeleteQuery, } from "./sql.builders"
import { Sql } from "./sql"
import { Meta } from "./meta"
import { Schema } from "./schema"
import { Inspect } from "./inspect"
import { pick, omit, toStr, mergeParams, nextParam, snakeCase } from "./utils"
import { converterFor, DateTimeConverter } from "./converters"
import { table, column, Table, DefaultValues, DataType, } from "./model"
import { Sqlite } from "./sqlite/driver"
import { SqliteDialect } from "./sqlite/dialect"
import { MySql } from "./mysql/driver"
import { MySqlDialect } from "./mysql/dialect"
import { PostgreSql } from "./postgres/driver"
import { PostgreSqlDialect } from "./postgres/dialect"

const sqlite = (() => { return Sqlite.init().$ })();
const mysql = (() => { return MySql.init().$ })();
const postgres = (() => { return PostgreSql.init().$ })();

export { 
  Sql,
  Meta,
  Schema,
  ConnectionBase,
  Connection,
  SyncConnection,
  NamingStrategy,
  SqlBuilder,
  ReflectMeta,
  Dialect,
  DialectTypes, 
  ColumnType,
  DefaultStrategy,
  SnakeCaseStrategy,
  WhereQuery,
  SelectQuery,
  UpdateQuery,
  DeleteQuery,
  Inspect,
  converterFor,
  DateTimeConverter,
  table,
  column,
  Table,
  DefaultValues,
  DataType,
  ColumnDefinition, Driver, DbBinding, Statement, SyncStatement, Fragment, TableDefinition, TypeConverter,
  Sqlite, SqliteDialect,         sqlite,
  MySql, MySqlDialect,           mysql,
  PostgreSql, PostgreSqlDialect, postgres,
  pick, omit, toStr, mergeParams, nextParam, snakeCase,
}
