import { connect } from "./drivers/sqlite"

export const connection = connect("app.db")
export const $ = connection.$
export const async = connection.async
export const sync = connection.sync
