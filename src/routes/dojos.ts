import { FastifyInstance, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../database/typeorm/data-source";
import { Aluno } from "../database/typeorm/entity/Aluno";
import { categorias } from "../config/categorias";
import { Dojo } from "../database/typeorm/entity/Dojo";

export async function dojosRoutes(fastify: FastifyInstance) {
  const dojoRepository = AppDataSource.getRepository(Dojo);

  fastify.addHook("preHandler", async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return reply.status(401).send({ error: "Token não fornecido" });
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "hayato-dojo"
      ) as any;
      request.user = decoded;
    } catch (error) {
      return reply.status(401).send({ error: "Token inválido" });
    }
  });

  fastify.post("/dojo/tecnics/add", async (request, reply) => {
    try {
      // extrai o novo valor e o dojoId do usuário autenticado
      const { tecnics } = request.body as any;

      console.log("TA AQUI2");
      const { dojoId } = (request as any).user;

      if (!dojoId) {
        return reply.status(404).send({ error: "Sem token" });
      }

      console.log("TA AQUI3", dojoId);

      // busca o dojo
      const dojo = await dojoRepository.findOne({ where: { id: dojoId } });
      console.log({ dojo });
      if (!dojo) {
        return reply.status(404).send({ error: "Dojo não encontrado" });
      }

      if (dojo.id !== dojoId) {
        return reply.status(404).send({ error: "Sem permissão" });
      }

      // atualiza e salva
      dojo.tecnics = tecnics ?? "";
      await dojoRepository.save(dojo);

      return reply.send({
        message: "Tecnics atualizado com sucesso",
        dojo,
      });
    } catch (err) {
      console.log(JSON.stringify(err, null, 2));
      fastify.log.error("Erro ao atualizar tecnics do dojo:", err);
      return reply.status(500).send({ error: "Erro interno do servidor" });
    }
  });

  fastify.get("/dojo/tecnics", async (request, reply) => {
    try {
      const { dojoId } = (request as any).user;

      const dojo = await dojoRepository.findOne({
        where: { id: dojoId },
      });

      return reply.send({
        tecnics: dojo?.tecnics ?? "",
      });
    } catch (error) {
      console.error("Erro ao buscar tecnics:", error);
      return reply.status(500).send({ error: "Erro interno do servidor" });
    }
  });
}
