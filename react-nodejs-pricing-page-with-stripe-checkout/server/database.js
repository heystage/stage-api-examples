const connect = require('@databases/sqlite')
const { sql } = require('@databases/sqlite')

// Basic in-memory sqlite database

class Database {
  constructor() {
    this.db = connect()
    this.prepare()
  }
  async prepare() {
    await this.db.query(sql`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          uuid VARCHAR NOT NULL,
          username VARCHAR NOT NULL UNIQUE,
          password VARCHAR NOT NULL
        );
      `)
  }
  async createUser(uuid, username, password) {
    await this.db.query(sql`
        INSERT INTO users (uuid, username, password)
          VALUES (${uuid}, ${username}, ${password})
        ON CONFLICT (id) DO UPDATE
          SET value=excluded.value;
      `)
  }
  async getUser(username) {
    const results = await this.db.query(sql`
        SELECT id, uuid, username, password FROM users WHERE username=${username};
      `)
    return results ? results[0] : undefined
  }
  async getAllUsers() {
    const results = await this.db.query(sql`
      SELECT id, uuid, username, password FROM users;
    `)
    return results
  }
  async removeUser(username) {
    await this.db.query(sql`
        DELETE FROM users WHERE username=${username};
      `)
  }
}

module.exports = Database
