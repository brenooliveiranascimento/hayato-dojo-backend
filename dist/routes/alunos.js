"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alunosRoutes = alunosRoutes;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const data_source_1 = require("../database/typeorm/data-source");
const Aluno_1 = require("../database/typeorm/entity/Aluno");
const schemas_1 = require("../schemas");
async function alunosRoutes(fastify) {
    const alunoRepository = data_source_1.AppDataSource.getRepository(Aluno_1.Aluno);
    fastify.addHook("preHandler", async (request, reply) => {
        try {
            const token = request.headers.authorization?.replace("Bearer ", "");
            if (!token) {
                return reply.status(401).send({ error: "Token não fornecido" });
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "hayato-dojo");
            request.user = decoded;
        }
        catch (error) {
            return reply.status(401).send({ error: "Token inválido" });
        }
    });
    fastify.post("/alunos", {
        schema: {
            body: schemas_1.AlunoSchema,
        },
    }, async (request, reply) => {
        try {
            const { nome, idade, peso, kyu, dan, categoria, categoriaKata } = request.body;
            const { dojoId } = request.user;
            const novoAluno = alunoRepository.create({
                nome,
                idade,
                peso,
                kyu,
                dan,
                dojoId,
                categoria,
                categoriaKata,
            });
            await alunoRepository.save(novoAluno);
            return reply.status(201).send({
                message: "Aluno cadastrado com sucesso",
                aluno: novoAluno,
            });
        }
        catch (error) {
            console.error("Erro ao cadastrar aluno:", error);
            return reply.status(500).send({ error: "Erro interno do servidor" });
        }
    });
    fastify.get("/dojo/alunos", async (request, reply) => {
        try {
            const { dojoId } = request.user;
            const alunos = await alunoRepository.find({
                where: { dojoId },
                order: { nome: "ASC" },
            });
            return reply.send({
                alunos,
                total: alunos.length,
            });
        }
        catch (error) {
            console.error("Erro ao listar alunos:", error);
            return reply.status(500).send({ error: "Erro interno do servidor" });
        }
    });
    fastify.get("/alunos", async (request, reply) => {
        try {
            const { dojoId } = request.user;
            const alunos = await alunoRepository.find({
                order: { nome: "ASC" },
            });
            return reply.send({
                alunos,
                total: alunos.length,
            });
        }
        catch (error) {
            console.error("Erro ao listar alunos:", error);
            return reply.status(500).send({ error: "Erro interno do servidor" });
        }
    });
    fastify.get("/alunos/:id", async (request, reply) => {
        try {
            const { id } = request.params;
            console.log({ id });
            const { dojoId } = request.user;
            const aluno = await alunoRepository.findOne({
                where: { id, dojoId },
            });
            if (!aluno) {
                return reply.status(404).send({ error: "Aluno não encontrado" });
            }
            return reply.send({ aluno });
        }
        catch (error) {
            console.error("Erro ao buscar aluno:", error);
            return reply.status(500).send({ error: "Erro interno do servidor" });
        }
    });
    fastify.put("/alunos/:id", {
        schema: {
            body: schemas_1.AlunoSchema,
        },
    }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { dojoId } = request.user;
            const { nome, idade, peso, kyu, dan, categoriaKata } = request.body;
            if (kyu && dan) {
                return reply
                    .status(404)
                    .send({ error: "Não deve preencher kyu e dan ao mesmo tempo" });
            }
            const aluno = await alunoRepository.findOne({
                where: { id, dojoId },
            });
            if (!aluno) {
                return reply.status(404).send({ error: "Aluno não encontrado" });
            }
            await alunoRepository.update(id, {
                nome,
                idade,
                peso,
                kyu,
                dan: dan ?? null,
                categoriaKata,
            });
            const alunoAtualizado = await alunoRepository.findOne({
                where: { id },
            });
            return reply.send({
                message: "Aluno atualizado com sucesso",
                aluno: alunoAtualizado,
            });
        }
        catch (error) {
            console.error("Erro ao atualizar aluno:", error);
            return reply.status(500).send({ error: "Erro interno do servidor" });
        }
    });
    fastify.delete("/alunos/:id", async (request, reply) => {
        try {
            const { id } = request.params;
            console.log({ id });
            const { dojoId } = request.user;
            const aluno = await alunoRepository.findOne({
                where: { id, dojoId },
            });
            if (!aluno) {
                return reply.status(404).send({ error: "Aluno não encontrado" });
            }
            await alunoRepository.delete(id);
            return reply.send({ message: "Aluno deletado com sucesso" });
        }
        catch (error) {
            console.error("Erro ao deletar aluno:", error);
            return reply.status(500).send({ error: "Erro interno do servidor" });
        }
    });
}
