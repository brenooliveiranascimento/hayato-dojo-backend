import Fastify from "fastify";
import { AppDataSource } from "./database/typeorm/data-source";
import { authRoutes } from "./routes/auth";
import { alunosRoutes } from "./routes/alunos";
import "dotenv/config";
require("dotenv").config();

const fastify = Fastify({
  logger: true,
});

// Registrar plugins
fastify.register(require("@fastify/cors"), {
  origin: true,
});

// Registrar rotas
fastify.register(authRoutes);
fastify.register(alunosRoutes);

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
