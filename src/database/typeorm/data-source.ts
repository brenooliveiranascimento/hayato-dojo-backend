import { DataSource } from "typeorm";
import path = require("path");
import "dotenv/config";

console.log({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "karate",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "karate_db",
  synchronize: false,
  logging: true,
  entities: [path.resolve(__dirname, "entity", "*{js,.ts}")],
  migrations: [path.resolve(__dirname, "migrations", "*{js,.ts}")],
});

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "karate",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "karate_db",
  synchronize: false,
  logging: true,
  entities: [path.resolve(__dirname, "entity", "*{js,.ts}")],
  migrations: [path.resolve(__dirname, "migrations", "*{js,.ts}")],
});
