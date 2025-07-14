"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const data_source_1 = require("./database/typeorm/data-source");
const auth_1 = require("./routes/auth");
const alunos_1 = require("./routes/alunos");
require("dotenv/config");
require("dotenv").config();
const keys_1 = __importDefault(require("./routes/keys"));
const dojos_1 = require("./routes/dojos");
const fastify = (0, fastify_1.default)({
    logger: true,
});
fastify.register(require("@fastify/cors"), {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
});
fastify.register(auth_1.authRoutes);
fastify.register(alunos_1.alunosRoutes);
fastify.register(keys_1.default);
fastify.register(dojos_1.dojosRoutes);
async function start() {
    try {
        await data_source_1.AppDataSource.initialize();
        console.log("Banco de dados conectado com sucesso");
        await fastify.listen({ port: 3000, host: "0.0.0.0" });
        console.log("Servidor rodando na porta 3000");
    }
    catch (error) {
        console.error("Erro ao iniciar servidor:", error);
        process.exit(1);
    }
}
start();
