"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dojosRoutes = dojosRoutes;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const data_source_1 = require("../database/typeorm/data-source");
const Dojo_1 = require("../database/typeorm/entity/Dojo");
async function dojosRoutes(fastify) {
    const dojoRepository = data_source_1.AppDataSource.getRepository(Dojo_1.Dojo);
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
    fastify.post("/dojo/tecnics/add", async (request, reply) => {
        try {
            const { tecnics } = request.body;
            console.log("TA AQUI2");
            const { dojoId } = request.user;
            if (!dojoId) {
                return reply.status(404).send({ error: "Sem token" });
            }
            console.log("TA AQUI3", dojoId);
            const dojo = await dojoRepository.findOne({ where: { id: dojoId } });
            console.log({ dojo });
            if (!dojo) {
                return reply.status(404).send({ error: "Dojo não encontrado" });
            }
            if (dojo.id !== dojoId) {
                return reply.status(404).send({ error: "Sem permissão" });
            }
            dojo.tecnics = tecnics ?? "";
            await dojoRepository.save(dojo);
            return reply.send({
                message: "Tecnics atualizado com sucesso",
                dojo,
            });
        }
        catch (err) {
            console.log(JSON.stringify(err, null, 2));
            fastify.log.error("Erro ao atualizar tecnics do dojo:", err);
            return reply.status(500).send({ error: "Erro interno do servidor" });
        }
    });
    fastify.get("/dojo/tecnics", async (request, reply) => {
        try {
            const { dojoId } = request.user;
            const dojo = await dojoRepository.findOne({
                where: { id: dojoId },
            });
            return reply.send({
                tecnics: dojo?.tecnics ?? "",
            });
        }
        catch (error) {
            console.error("Erro ao buscar tecnics:", error);
            return reply.status(500).send({ error: "Erro interno do servidor" });
        }
    });
}
