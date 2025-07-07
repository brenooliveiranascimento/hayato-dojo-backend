import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../database/typeorm/data-source";
import { Dojo } from "../database/typeorm/entity/Dojo";
import { DojoSchema, LoginSchema } from "../schemas";

export async function authRoutes(fastify: FastifyInstance) {
  const dojoRepository = AppDataSource.getRepository(Dojo);

  // Rota para cadastro de dojo
  fastify.post(
    "/dojos",
    {
      schema: {
        body: DojoSchema,
      },
    },
    async (request, reply) => {
      try {
        const { nome, cidade, email, senha } = request.body as any;

        // Verificar se o email já existe
        const dojoExistente = await dojoRepository.findOne({
          where: { email },
        });
        if (dojoExistente) {
          return reply.status(400).send({ error: "Email já está em uso" });
        }

        // Criptografar senha
        const senhaHash = await bcrypt.hash(senha, 10);
        console.log("TAAQUI");
        // Criar novo dojo
        const novoDojo = dojoRepository.create({
          nome,
          cidade,
          email,
          senha: senhaHash,
        });

        const token = jwt.sign(
          { dojoId: novoDojo.id, email: novoDojo.email },
          process.env.JWT_SECRET || "hayato-dojo",
          { expiresIn: "24h" }
        );

        await dojoRepository.save(novoDojo);

        // Remover senha da resposta
        const { senha: _, ...dojoResponse } = novoDojo;

        return reply.status(201).send({
          message: "Dojo cadastrado com sucesso",
          dojo: dojoResponse,
          token,
        });
      } catch (error) {
        console.error("Erro ao cadastrar dojo:", error);
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    }
  );

  fastify.post(
    "/login",
    {
      schema: {
        body: LoginSchema,
      },
    },
    async (request, reply) => {
      try {
        const { email, senha } = request.body as any;

        const dojo = await dojoRepository.findOne({ where: { email } });
        if (!dojo) {
          return reply.status(401).send({ error: "Credenciais inválidas" });
        }

        const senhaValida = await bcrypt.compare(senha, dojo.senha);
        if (!senhaValida) {
          return reply.status(401).send({ error: "Credenciais inválidas" });
        }

        const token = jwt.sign(
          { dojoId: dojo.id, email: dojo.email },
          process.env.JWT_SECRET || "hayato-dojo",
          { expiresIn: "24h" }
        );

        return reply.send({
          message: "Login realizado com sucesso",
          token,
          dojo: {
            id: dojo.id,
            nome: dojo.nome,
            cidade: dojo.cidade,
            email: dojo.email,
          },
        });
      } catch (error) {
        console.error("Erro ao fazer login:", error);
        return reply.status(500).send({ error: "Erro interno do servidor" });
      }
    }
  );
}
