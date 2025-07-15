"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bracketRoutes;
const categorias_1 = require("../config/categorias");
const data_source_1 = require("../database/typeorm/data-source");
const Aluno_1 = require("../database/typeorm/entity/Aluno");
const findCategoria = (tipo, categoriaId) => {
    console.log(`Procurando categoria ${tipo} com ID ${categoriaId} (tipo: ${typeof categoriaId})`);
    const id = typeof categoriaId === "string"
        ? parseInt(categoriaId)
        : categoriaId;
    const categoria = categorias_1.categorias[tipo].find((cat) => cat.codigo === id);
    if (!categoria) {
        console.log(`Categoria não encontrada. IDs disponíveis para ${tipo}:`, categorias_1.categorias[tipo].map((c) => c.codigo).join(", "));
    }
    return categoria;
};
const groupAthletesByCategory = (atletas, tipo) => {
    const grouped = {};
    console.log(`\nAgrupando atletas para ${tipo}:`);
    atletas.forEach((atleta) => {
        const categoriaId = tipo === "kumite" ? atleta.categoria : atleta.categoriaKata;
        console.log(`  Atleta ${atleta.nome} - Categoria ID: ${categoriaId}`);
        if (!categoriaId) {
            console.log(`    -> Categoria ID não definida, pulando...`);
            return;
        }
        const categoria = findCategoria(tipo, categoriaId);
        if (!categoria) {
            console.log(`    -> Categoria não encontrada para ID ${categoriaId}`);
            return;
        }
        let key = `${categoria.categoria}_${categoria.genero}_${categoria.faixa}`;
        if (tipo === "kumite" && categoria.descricaoPeso) {
            key += `_${categoria.descricaoPeso}`;
        }
        console.log(`    -> Categoria encontrada: ${key}`);
        if (!grouped[key]) {
            grouped[key] = {
                categoria: categoria,
                atletas: [],
            };
        }
        const atletaComCategoria = {
            ...atleta,
            categoriaInfo: categoria,
        };
        grouped[key].atletas.push(atletaComCategoria);
    });
    return grouped;
};
const createTournamentBracket = (atletas, categoriaInfo) => {
    const participantes = [...atletas];
    console.log(`\nCriando bracket para ${participantes.length} atletas`);
    const totalAtletas = participantes.length;
    const rounds = Math.ceil(Math.log2(totalAtletas));
    const atletasNoPrimeiroRound = Math.pow(2, rounds);
    const byes = atletasNoPrimeiroRound - totalAtletas;
    console.log(`  - Total de rounds necessários: ${rounds}`);
    console.log(`  - Atletas no primeiro round (com BYEs): ${atletasNoPrimeiroRound}`);
    console.log(`  - Número de BYEs: ${byes}`);
    const tournamentRounds = [];
    let currentMatchId = 1;
    const primeiroRoundComByes = [];
    let byesDistribuidos = 0;
    let atletaIdx = 0;
    for (let i = 0; i < atletasNoPrimeiroRound; i++) {
        if (byesDistribuidos < byes && i % 2 === 1) {
            primeiroRoundComByes.push(null);
            byesDistribuidos++;
        }
        else if (atletaIdx < participantes.length) {
            primeiroRoundComByes.push(participantes[atletaIdx]);
            atletaIdx++;
        }
        else {
            primeiroRoundComByes.push(null);
        }
    }
    const firstRoundMatches = [];
    for (let i = 0; i < atletasNoPrimeiroRound / 2; i++) {
        const atleta1 = primeiroRoundComByes[i * 2];
        const atleta2 = primeiroRoundComByes[i * 2 + 1];
        const match = {
            id: currentMatchId++,
            date: new Date().toDateString(),
            teams: [
                atleta1
                    ? { name: atleta1.nome, atletaId: atleta1.id }
                    : { name: "Sem competidor" },
                atleta2
                    ? { name: atleta2.nome, atletaId: atleta2.id }
                    : { name: "Sem competidor" },
            ],
        };
        firstRoundMatches.push(match);
    }
    let primeiroRoundTitulo = "Eliminatórias";
    if (atletasNoPrimeiroRound === 2) {
        primeiroRoundTitulo = "Final";
    }
    else if (atletasNoPrimeiroRound === 4) {
        primeiroRoundTitulo = "Semifinal";
    }
    else if (atletasNoPrimeiroRound === 8) {
        primeiroRoundTitulo = "Quartas de Final";
    }
    else if (atletasNoPrimeiroRound === 16) {
        primeiroRoundTitulo = "Oitavas de Final";
    }
    else if (atletasNoPrimeiroRound === 32) {
        primeiroRoundTitulo = "16-avos de Final";
    }
    else if (atletasNoPrimeiroRound === 64) {
        primeiroRoundTitulo = "32-avos de Final";
    }
    tournamentRounds.push({
        title: primeiroRoundTitulo,
        seeds: firstRoundMatches,
    });
    let previousRoundMatches = firstRoundMatches.length;
    for (let round = 2; round <= rounds; round++) {
        const currentRoundMatches = previousRoundMatches / 2;
        const roundMatches = [];
        for (let i = 0; i < currentRoundMatches; i++) {
            roundMatches.push({
                id: currentMatchId++,
                date: new Date().toDateString(),
                teams: [{ name: "" }, { name: "" }],
            });
        }
        let roundTitle = "";
        if (currentRoundMatches === 1) {
            roundTitle = "Final";
        }
        else if (currentRoundMatches === 2) {
            roundTitle = "Semifinal";
        }
        else if (currentRoundMatches === 4) {
            roundTitle = "Quartas de Final";
        }
        else if (currentRoundMatches === 8) {
            roundTitle = "Oitavas de Final";
        }
        else if (currentRoundMatches === 16) {
            roundTitle = "16-avos de Final";
        }
        else if (currentRoundMatches === 32) {
            roundTitle = "32-avos de Final";
        }
        else {
            roundTitle = `Round ${round}`;
        }
        tournamentRounds.push({
            title: roundTitle,
            seeds: roundMatches,
        });
        previousRoundMatches = currentRoundMatches;
    }
    console.log(`  - Bracket criado com ${tournamentRounds.length} rounds`);
    return tournamentRounds;
};
async function bracketRoutes(fastify) {
    fastify.get("/api/categorias", async (request, reply) => {
        return reply.send({
            kata: categorias_1.categorias.kata.map((cat) => ({
                id: cat.codigo,
                categoria: cat.categoria,
                genero: cat.genero,
                faixa: cat.faixa,
                idadeMin: cat.idadeMin,
                idadeMax: cat.idadeMax,
            })),
            kumite: categorias_1.categorias.kumite.map((cat) => ({
                id: cat.codigo,
                categoria: cat.categoria,
                genero: cat.genero,
                faixa: cat.faixa,
                idadeMin: cat.idadeMin,
                idadeMax: cat.idadeMax,
                pesoMin: cat.pesoMin,
                pesoMax: cat.pesoMax,
                descricaoPeso: cat.descricaoPeso,
            })),
        });
    });
    fastify.get("/api/brackets", async (request, reply) => {
        try {
            const alunoRepository = data_source_1.AppDataSource.getRepository(Aluno_1.Aluno);
            const token = request.headers.authorization;
            if (!token) {
                return reply.code(401).send({ error: "Token não fornecido" });
            }
            const atletasRequest = await alunoRepository.find();
            const atletas = atletasRequest.sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }));
            console.log("==================== DEBUG COMPLETO ====================");
            console.log("Atletas encontrados:", atletas.length);
            if (atletas.length > 0) {
                console.log("Estrutura completa do primeiro atleta:", JSON.stringify(atletas[0], null, 2));
                console.log("Tipos dos campos do primeiro atleta:");
                console.log("  - id:", typeof atletas[0].id, "valor:", atletas[0].id);
                console.log("  - nome:", typeof atletas[0].nome, "valor:", atletas[0].nome);
                console.log("  - categoria:", typeof atletas[0].categoria, "valor:", atletas[0].categoria);
                console.log("  - categoriaKata:", typeof atletas[0].categoriaKata, "valor:", atletas[0].categoriaKata);
                console.log("  - peso:", typeof atletas[0].peso, "valor:", atletas[0].peso);
            }
            const kumiteGroups = groupAthletesByCategory(atletas, "kumite");
            const kataGroups = groupAthletesByCategory(atletas, "kata");
            const kumiteBrackets = [];
            const kataBrackets = [];
            let globalMatchId = 1;
            for (const [key, group] of Object.entries(kumiteGroups)) {
                const total = group.atletas.length;
                const cat = group.categoria;
                const categoriaInfo = {
                    tipo: "kumite",
                    categoria: `${cat.codigo} - ${cat.categoria}` || key,
                    genero: cat.genero,
                    faixa: cat.faixa,
                    peso: cat.descricaoPeso || undefined,
                    totalAtletas: total,
                };
                let rounds;
                if (total > 1) {
                    rounds = createTournamentBracket(group.atletas, cat);
                }
                else {
                    const atleta = group.atletas[0];
                    rounds = [
                        {
                            title: "Categoria com único participante",
                            seeds: [
                                {
                                    id: globalMatchId++,
                                    date: new Date().toDateString(),
                                    teams: [{ name: atleta.nome, atletaId: atleta.id }],
                                },
                            ],
                        },
                    ];
                }
                kumiteBrackets.push({
                    categoriaInfo,
                    rounds,
                });
            }
            for (const [key, group] of Object.entries(kataGroups)) {
                const total = group.atletas.length;
                const cat = group.categoria;
                const categoriaInfo = {
                    tipo: "kata",
                    categoria: `${cat.codigo} - ${cat.categoria}` || key,
                    genero: cat.genero,
                    faixa: cat.faixa,
                    peso: undefined,
                    totalAtletas: total,
                };
                let rounds;
                if (total > 1) {
                    rounds = createTournamentBracket(group.atletas, cat);
                }
                else {
                    const atleta = group.atletas[0];
                    rounds = [
                        {
                            title: "Categoria com único participante",
                            seeds: [
                                {
                                    id: globalMatchId++,
                                    date: new Date().toDateString(),
                                    teams: [{ name: atleta.nome, atletaId: atleta.id }],
                                },
                            ],
                        },
                    ];
                }
                kataBrackets.push({
                    categoriaInfo,
                    rounds,
                });
            }
            console.log("\n==================== RESULTADO FINAL ====================");
            console.log(`Brackets Kumite criados: ${kumiteBrackets.length}`);
            console.log(`Brackets Kata criados: ${kataBrackets.length}`);
            if (kumiteBrackets.length === 0 &&
                kataBrackets.length === 0 &&
                atletas.length > 0) {
                console.log("\nNENHUM BRACKET FOI CRIADO! Verificando possíveis problemas:");
                console.log("1. Os IDs de categoria dos atletas podem não corresponder aos códigos definidos");
                console.log("2. Os campos categoria/categoriaKata podem estar null ou undefined");
                console.log("3. Pode haver apenas 1 atleta por categoria");
                const categoriasKumiteUsadas = new Set(atletas.map((a) => a.categoria).filter((c) => c != null));
                const categoriasKataUsadas = new Set(atletas.map((a) => a.categoriaKata).filter((c) => c != null));
                console.log("\nCategorias Kumite nos atletas:", Array.from(categoriasKumiteUsadas));
                console.log("Categorias Kata nos atletas:", Array.from(categoriasKataUsadas));
            }
            return reply.send({
                kumite: kumiteBrackets,
                kata: kataBrackets,
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: "Erro ao processar brackets" });
        }
    });
}
