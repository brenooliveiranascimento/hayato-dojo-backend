"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const path = require("path");
require("dotenv/config");
exports.AppDataSource = new typeorm_1.DataSource({
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
