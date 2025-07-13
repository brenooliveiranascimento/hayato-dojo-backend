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
const categorias_1 = require("../config/categorias");
const Dojo_1 = require("../database/typeorm/entity/Dojo");
function extrairGraduacao(kyuStr, danStr) {
    const kyu = kyuStr ? parseInt(kyuStr.replace(/[^0-9]/g, "")) || 0 : 0;
    const dan = danStr ? parseInt(danStr.replace(/[^0-9]/g, "")) || 0 : 0;
    return { kyu, dan };
}
function determinarGenero(categoria) {
    return categoria % 2 === 1 ? "M" : "F";
}
function verificarGraduacao(atleta, faixaCategoria) {
    const { kyu, dan } = extrairGraduacao(atleta.kyu, atleta.dan);
    if (dan > 0) {
        return (faixaCategoria.includes("1° KYU ACIMA") ||
            faixaCategoria.includes("2° KYU ACIMA") ||
            faixaCategoria.includes("3° KYU ACIMA"));
    }
    if (faixaCategoria.includes("9° A 6° KYU"))
        return kyu >= 6 && kyu <= 9;
    if (faixaCategoria.includes("9° A 7° KYU"))
        return kyu >= 7 && kyu <= 9;
    if (faixaCategoria.includes("9° A 5° KYU"))
        return kyu >= 5 && kyu <= 9;
    if (faixaCategoria.includes("9° A 3° KYU"))
        return kyu >= 3 && kyu <= 9;
    if (faixaCategoria.includes("6° A 4° KYU"))
        return kyu >= 4 && kyu <= 6;
    if (faixaCategoria.includes("5° A 3° KYU"))
        return kyu >= 3 && kyu <= 5;
    if (faixaCategoria.includes("5° A 2° KYU"))
        return kyu >= 2 && kyu <= 5;
    if (faixaCategoria.includes("4° A 2° KYU"))
        return kyu >= 2 && kyu <= 4;
    if (faixaCategoria.includes("3° KYU ACIMA"))
        return kyu <= 3 || dan > 0;
    if (faixaCategoria.includes("2° KYU ACIMA"))
        return kyu <= 2 || dan > 0;
    if (faixaCategoria.includes("1° KYU ACIMA"))
        return kyu <= 1 || dan > 0;
    if (faixaCategoria.includes("PEGADOR"))
        return true;
    return false;
}
function encontrarCategoria(atleta, tipoLuta) {
    const categoriasList = categorias_1.categorias[tipoLuta];
    const genero = determinarGenero(tipoLuta === "kata" ? atleta.categoriaKata : atleta.categoria);
    return categoriasList.find((cat) => {
        const idadeOk = atleta.idade >= cat.idadeMin && atleta.idade <= cat.idadeMax;
        const generoOk = genero === cat.genero;
        const graduacaoOk = verificarGraduacao(atleta, cat.faixa);
        if (tipoLuta === "kumite") {
            const pesoOk = atleta.peso >= cat.pesoMin && atleta.peso <= cat.pesoMax;
            return idadeOk && generoOk && graduacaoOk && pesoOk;
        }
        return idadeOk && generoOk && graduacaoOk;
    });
}
function separarAtletasPorCategoria(atletas) {
    const resultado = {
        kata: {},
        kumite: {},
    };
    categorias_1.categorias.kata.forEach((cat) => {
        resultado.kata[cat.codigo] = {
            categoria: cat,
            atletas: [],
        };
    });
    categorias_1.categorias.kumite.forEach((cat) => {
        resultado.kumite[cat.codigo] = {
            categoria: cat,
            atletas: [],
        };
    });
    atletas.forEach((atleta) => {
        const categoriaKata = encontrarCategoria(atleta, "kata");
        if (categoriaKata) {
            resultado.kata[categoriaKata.codigo].atletas.push(atleta);
        }
        const categoriaKumite = encontrarCategoria(atleta, "kumite");
        if (categoriaKumite) {
            resultado.kumite[categoriaKumite.codigo].atletas.push(atleta);
        }
    });
    return resultado;
}
function obterCategoriasComAtletas(categoriasSeparadas) {
    const resultado = {
        kata: {},
        kumite: {},
    };
    Object.keys(categoriasSeparadas.kata).forEach((codigo) => {
        const cat = categoriasSeparadas.kata[codigo];
        if (cat.atletas.length > 0) {
            resultado.kata[codigo] = cat;
        }
    });
    Object.keys(categoriasSeparadas.kumite).forEach((codigo) => {
        const cat = categoriasSeparadas.kumite[codigo];
        if (cat.atletas.length > 0) {
            resultado.kumite[codigo] = cat;
        }
    });
    return resultado;
}
function gerarEstatisticas(categoriasSeparadas) {
    const stats = {
        totalAtletas: 0,
        categoriasKataComAtletas: 0,
        categoriasKumiteComAtletas: 0,
        detalhePorCategoria: {
            kata: {},
            kumite: {},
        },
    };
    Object.keys(categoriasSeparadas.kata).forEach((codigo) => {
        const cat = categoriasSeparadas.kata[codigo];
        if (cat.atletas.length > 0) {
            stats.categoriasKataComAtletas++;
            stats.detalhePorCategoria.kata[codigo] = {
                nome: `${cat.categoria.categoria} ${cat.categoria.genero} ${cat.categoria.faixa}`,
                quantidade: cat.atletas.length,
                atletas: cat.atletas.map((a) => ({
                    nome: a.nome,
                    idade: a.idade,
                    peso: a.peso,
                    kyu: a.kyu,
                    dan: a.dan,
                })),
            };
        }
    });
    Object.keys(categoriasSeparadas.kumite).forEach((codigo) => {
        const cat = categoriasSeparadas.kumite[codigo];
        if (cat.atletas.length > 0) {
            stats.categoriasKumiteComAtletas++;
            stats.detalhePorCategoria.kumite[codigo] = {
                nome: `${cat.categoria.categoria} ${cat.categoria.genero} ${cat.categoria.faixa} ${cat.categoria.descricaoPeso}`,
                quantidade: cat.atletas.length,
                atletas: cat.atletas.map((a) => ({
                    nome: a.nome,
                    idade: a.idade,
                    peso: a.peso,
                    kyu: a.kyu,
                    dan: a.dan,
                })),
            };
        }
    });
    const atletasUnicos = new Set();
    Object.values(categoriasSeparadas.kata).forEach((cat) => {
        cat.atletas.forEach((atleta) => atletasUnicos.add(atleta.id));
    });
    Object.values(categoriasSeparadas.kumite).forEach((cat) => {
        cat.atletas.forEach((atleta) => atletasUnicos.add(atleta.id));
    });
    stats.totalAtletas = atletasUnicos.size;
    return stats;
}
async function alunosRoutes(fastify) {
    const dojoRepository = data_source_1.AppDataSource.getRepository(Dojo_1.Dojo);
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
            console.log({ dojoId });
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
    fastify.get("/dojo/alunos/auto/brackets", async (request, reply) => {
        try {
            const { dojoId } = request.user;
            const alunos = await alunoRepository.find();
            const categoriasSeparadas = separarAtletasPorCategoria(alunos);
            const categoriasComAtletas = obterCategoriasComAtletas(categoriasSeparadas);
            const estatisticas = gerarEstatisticas(categoriasSeparadas);
            const brackets = {
                kata: [],
                kumite: [],
            };
            Object.keys(categoriasSeparadas.kata).forEach((codigo) => {
                const cat = categoriasSeparadas.kata[codigo];
                if (cat.atletas.length > 0) {
                    brackets.kata.push({
                        codigoCategoria: codigo,
                        nomeCategoria: `${cat.categoria.categoria} ${cat.categoria.genero} ${cat.categoria.faixa}`,
                        atletas: cat.atletas,
                        totalAtletas: cat.atletas.length,
                    });
                }
            });
            Object.keys(categoriasSeparadas.kumite).forEach((codigo) => {
                const cat = categoriasSeparadas.kumite[codigo];
                if (cat.atletas.length > 0) {
                    brackets.kumite.push({
                        codigoCategoria: codigo,
                        nomeCategoria: `${cat.categoria.categoria} ${cat.categoria.genero} ${cat.categoria.faixa} ${cat.categoria.descricaoPeso}`,
                        atletas: cat.atletas,
                        totalAtletas: cat.atletas.length,
                    });
                }
            });
            return reply.send({ brackets, estatisticas });
        }
        catch (error) {
            console.error("Erro ao gerar categorias de atletas:", error);
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
    fastify.post("/dojos/tecnics", async (request, reply) => {
        try {
            console.log("TA AQUI");
            const { tecnics } = request.body;
            console.log("TA AQUI2");
            const { dojoId } = request.user;
            console.log("TA AQUI3", dojoId);
            const dojo = await dojoRepository.findOne({ where: { id: dojoId } });
            console.log({ dojo });
            if (!dojo) {
                return reply.status(404).send({ error: "Dojo não encontrado" });
            }
            if (dojo.id !== dojoId) {
                return reply.status(404).send({ error: "Sem permissão" });
            }
            dojo.tecnics = tecnics;
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
}
