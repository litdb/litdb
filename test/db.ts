import { connect } from "./drivers/sqlite"

export const connection = connect("app.db")
export const { $, async, sync } = connection