# litdb

litdb contains LINQ-like type-safe SQL builders for TypeScript/JavaScript for writing type-safe expressive SQL that's parameterized & portable across SQLite, MySQL & PostgreSQL.

Website: https://litdb.dev

[![](https://litdb.dev/img/bg-video.png)](https://youtu.be/0OVXvhj8nU4)

https://youtu.be/s5TC1n0ZiRI

## SQL-like

litdb lets you write familiar SQL you know using its type-safe expressions and query builders that's safe by default.

APIs are designed to keep a close affinity to SQL making it clear what SQL is being generated, expressions utilize tagged templates to take away the tedium of maintaining table and column references, parameterizing values and catering for different SQL dialects to retain the expressive freedom of SQL, but portable across multiple RDBMS's.

The primary difference between SQL is how queries are constructed, where the SELECT Query Builder wants queries to be constructed in the order they're run, by specifying the data sources first, i.e. the FROM table first, followed by any JOINs (just like LINQ) which allows litdb query builders to provide type safety and intellisense for the rest of the query.

![](https://litdb.dev/img/sql-queries.jpeg)

## Small

- **9kb** .min + .zip
- **36kb** .min
- **0** dependencies

## Install

To use litdb with your favorite ORM, no driver is required. Just use the `litdb` package directly:

```sh
npm install litdb
```

`litdb` is also available as a module, where it can be used directly in the browser:

```html
<script type="module">
import { sqlite as $ } from "https://unpkg.com/litdb/dist/index.min.js"
    
const { sql, params } = $.from(Contact).select(c => $`${c.name}`).build()
</script>
```

To get the most out of `litdb` we recommend using text editors that supports TypeScript definitions 
(e.g. VS Code, JetBrains IDEs, neovim, etc.)

# LitDB Drivers

Lightweight drivers with native support for its typed SQL Builders and parameterized SQL Expressions 
are also available for the popular databases:

### Bun SQLite

Use with [Bun's native SQLite3 driver](https://bun.sh/docs/api/sqlite):

```sh
bun install @litdb/bun-sqlite
```

### Node better-sqlite

Use with Node [better-sqlite3](https://github.com/WiseLibs/better-sqlite3):

```sh
npm install @litdb/better-sqlite
```

### PostgreSQL

Use with [postgres.js](https://github.com/porsager/postgres) client:

```sh
npm install @litdb/postgres
```

### MySql

Use with [node-mysql2](https://github.com/sidorares/node-mysql2) client:

```sh
npm install @litdb/mysql
```

### Request a Driver

If you'd like to see a driver for a specific client, please open or vote for a feature request on litdb's 
[GitHub Discussions](https://github.com/litdb/litdb/discussions/categories/ideas).

## Driver Usage

litdb drivers are lightweight data adapters providing a number of convenience APIs for executing SQL and parameters. 
They can be used with or without litdb SQL Builders, but offer the most value when used together. 

The same APIs are available across all drivers, so you can easily switch between them. They include both **sync** APIs
recommended for SQLite libraries that use SQLite's native blocking APIs, whilst **async** APIs should be used for 
all other databases, e.g. PostgreSQL and MySQL.

This is an example of using the Bun SQLite driver:

**db.ts**

```ts
import { connect } from "./drivers/sqlite"

export const connection = connect("app.db") // WAL enabled by default
export const { $, sync:db, async, native } = connection
```

> When needed use `native` to access underlying driver

**app.ts**

```ts
import { $, db } from "./db"
import { Contact } from "./models"

db.dropTable(Contact)
db.createTable(Contact)
db.insertAll([
    new Contact({ name:"John Doe", email:"john@mail.org" }),
    new Contact({ name:"Jane Doe", email:"jane@mail.org" }),
])

const janeEmail = 'jane@mail.org'
const jane = db.one<Contact>($.from(Contact).where(c => $`${c.email} = ${janeEmail}`))!

// Insert examples
const {lastInsertRowid:bobId} = db.insert(new Contact({ name:"Bob", email:"bob@mail.org" }))
const {lastInsertRowid} = db.exec`INSERT INTO Contact(name,email) VALUES('Jo','jo@doe.org')`
const name = 'Alice', email = 'alice@mail.org'
db.exec`INSERT INTO Contact(name,email) VALUES (${name}, ${email})`

// Typed SQL fragment with named param example
const hasId = <Table extends { id:number }>(id:number|bigint) =>
    (x:Table) => $.sql($`${x.id} = $id`, { id })

const contacts = db.all($.from(Contact).into(Contact))                // => Contact[]
const bob = db.one($.from(Contact).where(hasId(bobId)).into(Contact)) // => Contact    
const contactsCount = db.value($.from(Contact).select`COUNT(*)`)      // => number
const emails = db.column($.from(Contact).select(c => $`${c.email}`))  // => string[]
const contactsArray = db.arrays($.from(Contact))                      // => any[][]
const bobArray = db.array($.from(Contact).where(hasId(bobId)))        // => any[]

// Update examples
jane.email = 'jane@doe.org'
db.update(jane)                           // Update all properties
db.update(jane, { onlyProps:['email'] })  // Update only email
db.exec($.update(Contact).set({ email:jane.email }).where(hasId(jane.id))) // query builder

// Delete examples
db.delete(jane)
db.exec($.deleteFrom(Contact).where(hasId(jane.id))) // query builder
```

## Type Safe

Get productive intelli-sense for quickly accessing properties that exist your data model or design-time type-checking and compile-time static analysis errors for those that don't.

![](https://litdb.dev/img/features/typesafe.png)

Only reference table and columns that are included in your query, quickly identify missing tables, columns and any typos:

![](https://litdb.dev/img/features/typesafe2.png)

## Safe Refactoring

Since all references are statically typed to your models, you can safely refactor with confidence!

![](https://litdb.dev/img/features/safe-refactoring.gif)

## Composable

Queries are highly composable where external references can be used across multiple Query Builders and SQL fragments
to easily create and compose multiple complex queries with shared references.

SQL Builders and SQL fragments can be embedded inside other query builders utilizing the full expressiveness of SQL 
where their SQL and parameters are merged into the parent query.

```ts
// External aliased table references used across multiple query builders
const [ c, o ] = [ $.ref(Contact,'c'), $.ref(Order,'o') ]

const now = new Date()
const monthAgo = new Date(now.setDate(now.getDate()-30)).toISOString().split('T')[0]
const last30Days = $.from(Order,'o2')
    .where(o2 => $`${o2.contactId} = ${c.id}`)
    .and(o2 => $`${o2.createdAt} >= ${monthAgo}`)
    .select(o2 => $`COUNT(${o2.id})`)

const recentOrder = $.from(Order,'o3')
    .where(o3 => $`${o3.contactId} = ${c.id}`)
    .select(o3 => $`MAX(${o3.createdAt})`)

// Example of SQL Fragment with parameter
const startOfYear = `2024-01-01`
const o4 = $.ref(Order,'o4')
const totalOrders = $`SELECT SUM(${o4.total}) 
     FROM ${o4} o4 
    WHERE ${o4.contactId} = ${c.id} 
      AND ${o4.createdAt} >= ${startOfYear}`

// Compose queries from multiple query builders and SQL fragments
const q = $.from(c)
    .join(o, { on:(c,o) => $`${c.id} = ${o.contactId}`})
    .where`${o.createdAt} = (${recentOrder})`
    .select`
        ${c.id}, 
        ${c.name}, 
        ${o.createdAt} AS recentOrder, 
        (${last30Days}) AS last30Days,
        (${totalOrders}) AS totalOrders`
    .orderBy`last30Days DESC`
```

Generated SQL

```sql
SELECT c."id", 
       c."name", 
       o."createdAt" AS recentOrder, 
       (SELECT COUNT(o2."id")
          FROM "Order" o2
         WHERE o2."contactId" = c."id"
           AND o2."createdAt" >= $_1) AS last30Days,
       (SELECT SUM(o4."total") 
          FROM "Order" o4
         WHERE o4."contactId" = c."id" 
           AND o4."createdAt" >= $_2) AS totalOrders
 FROM "Contact" c
 JOIN "Order" o ON c."id" = o."contactId"
WHERE o."createdAt" = (SELECT MAX(o3."createdAt")
        FROM "Order" o3
        WHERE o3."contactId" = c."id")
ORDER BY last30Days DESC
```

PARAMS

    _1: 2024-10-12
    _2: 2024-01-01
