import { connect } from "./drivers/sqlite"

export const driver = connect("app.db")
export const $ = driver.$
export const async = driver.async
export const sync = driver.sync
