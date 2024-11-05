import { Database } from "bun:sqlite"

const db = new Database()

const run = (sql:string) => {
    console.log(sql)
    console.log(db.query(sql).run())
    console.log()
}

run(`CREATE TABLE "Contact" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "age" INTEGER
)`)

run(`INSERT INTO Contact (name,age) VALUES ('John', 20)`)
run(`INSERT INTO Contact (name,age) VALUES ('Jane', 30)`)

run(`UPDATE Contact SET age = 40`)
run(`UPDATE Contact SET age = 40 WHERE id = 1000`)
run(`DELETE FROM Contact WHERE id = 1000`)
run(`DELETE FROM Contact WHERE name = 'John'`)
