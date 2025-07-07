import { DataSource } from "typeorm";
import path = require("path");
import "dotenv/config";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "shuttle.proxy.rlwy.net",
  port: parseInt(process.env.DB_PORT || "5432", 10) || 5432,
  username: process.env.DB_USERNAME || "hayato",
  password: process.env.DB_PASSWORD || "karate_hayato",
  database: process.env.DB_NAME || "karate_db",
  synchronize: false,
  logging: true,
  entities: [path.resolve(__dirname, "entity", "*{js,.ts}")],
  migrations: [path.resolve(__dirname, "migrations", "*{js,.ts}")],
});
