import type { ColumnDefinition, Driver, DbBinding, Statement, TableDefinition, TypeConverter } from "./types"
import { Connection, ConnectionBase, DefaultNamingStrategy, SyncConnection } from "./connection"
import { WhereQuery, SelectQuery, UpdateQuery, DeleteQuery, } from "./sql.builders"
import { Sql } from "./sql"
import { Inspect } from "./inspect"
import { converterFor, DateTimeConverter } from "./converters"
import { table, column, Table, DefaultValues, DataType } from "./model"
import { Sqlite } from "./sqlite/driver"
import { MySql } from "./mysql/driver"
import { PostgreSql } from "./postgres/driver"

const sqlite = (() => { return Sqlite.init().$ })();
const mysql = (() => { return MySql.init().$ })();
const postgres = (() => { return PostgreSql.init().$ })();

export { 
  Sql,
  ConnectionBase,
  Connection,
  SyncConnection,
  DefaultNamingStrategy as NamingStrategy,
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
  ColumnDefinition, Driver, DbBinding, Statement, TableDefinition, TypeConverter,
  Sqlite,     sqlite,
  MySql,      mysql,
  PostgreSql, postgres,
}
