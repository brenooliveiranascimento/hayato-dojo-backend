"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const data_source_1 = require("../database/typeorm/data-source");
const Dojo_1 = require("../database/typeorm/entity/Dojo");
const schemas_1 = require("../schemas");
async function authRoutes(fastify) {
    const dojoRepository = data_source_1.AppDataSource.getRepository(Dojo_1.Dojo);
    fastify.post("/dojos", {
        schema: {
            body: schemas_1.DojoSchema,
        },
    }, async (request, reply) => {
        try {
            const { nome, cidade, email, senha } = request.body;
            const dojoExistente = await dojoRepository.findOne({
                where: { email },
            });
            if (dojoExistente) {
                return reply.status(400).send({ error: "Email já está em uso" });
            }
            const senhaHash = await bcryptjs_1.default.hash(senha, 10);
            console.log("TAAQUI");
            const novoDojo = dojoRepository.create({
                nome,
                cidade,
                email,
                senha: senhaHash,
            });
            const token = jsonwebtoken_1.default.sign({ dojoId: novoDojo.id, email: novoDojo.email }, process.env.JWT_SECRET || "hayato-dojo", { expiresIn: "24h" });
            await dojoRepository.save(novoDojo);
            const { senha: _, ...dojoResponse } = novoDojo;
            return reply.status(201).send({
                message: "Dojo cadastrado com sucesso",
                dojo: dojoResponse,
                token,
            });
        }
        catch (error) {
            console.error("Erro ao cadastrar dojo:", error);
            return reply.status(500).send({ error: "Erro interno do servidor" });
        }
    });
    fastify.post("/login", {
        schema: {
            body: schemas_1.LoginSchema,
        },
    }, async (request, reply) => {
        try {
            const { email, senha } = request.body;
            const dojo = await dojoRepository.findOne({ where: { email } });
            if (!dojo) {
                return reply.status(401).send({ error: "Credenciais inválidas" });
            }
            const senhaValida = await bcryptjs_1.default.compare(senha, dojo.senha);
            if (!senhaValida) {
                return reply.status(401).send({ error: "Credenciais inválidas" });
            }
            const token = jsonwebtoken_1.default.sign({ dojoId: dojo.id, email: dojo.email }, process.env.JWT_SECRET || "hayato-dojo", { expiresIn: "24h" });
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
        }
        catch (error) {
            console.error("Erro ao fazer login:", error);
            return reply.status(500).send({ error: "Erro interno do servidor" });
        }
    });
}
