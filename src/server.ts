import Fastify from "fastify";
import { AppDataSource } from "./database/typeorm/data-source";
import { authRoutes } from "./routes/auth";
import { alunosRoutes } from "./routes/alunos";
import "dotenv/config";
require("dotenv").config();
import cors from "@fastify/cors";
import bracketRoutes from "./routes/keys";
import { dojosRoutes } from "./routes/dojos";

const fastify = Fastify({
  logger: true,
});

// 1) registrar o CORS antes de tudo
fastify.register(require("@fastify/cors"), {
  origin: "*", // Alterado de true para "*"
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Opcional, mas recomendado para preflight requests
  allowedHeaders: ["Content-Type", "Authorization"], // Opcional, mas recomendado
});

// Registrar rotas
fastify.register(authRoutes);
fastify.register(alunosRoutes);
fastify.register(bracketRoutes);
fastify.register(dojosRoutes);

// Função para iniciar o servidor
async function start() {
  try {
    // Inicializar conexão com banco
    await AppDataSource.initialize();
    console.log("Banco de dados conectado com sucesso");
    // Iniciar servidor
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log("Servidor rodando na porta 3000");
  } catch (error) {
    console.error("Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

start();
