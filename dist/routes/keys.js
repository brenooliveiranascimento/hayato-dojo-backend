"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bracketRoutes;
const categorias_1 = require("../config/categorias");
const data_source_1 = require("../database/typeorm/data-source");
const Aluno_1 = require("../database/typeorm/entity/Aluno");
const findCategoria = (tipo, categoriaId) => {
    console.log(`Procurando categoria ${tipo} com ID ${categoriaId}`);
    const id = typeof categoriaId === "string" ? parseInt(categoriaId) : categoriaId;
    const categoria = categorias_1.categorias[tipo].find((cat) => cat.codigo === id);
    if (!categoria) {
        console.log(`Categoria não encontrada. IDs disponíveis para ${tipo}:`, categorias_1.categorias[tipo].map((c) => c.codigo).join(", "));
    }
    return categoria;
};
const getRoundTitle = (numberOfMatches) => {
    switch (numberOfMatches) {
        case 1:
            return "Final";
        case 2:
            return "Semifinal";
        case 4:
            return "Quartas de Final";
        case 8:
            return "Oitavas de Final";
        case 16:
            return "16-avos de Final";
        case 32:
            return "32-avos de Final";
        default:
            return `Round com ${numberOfMatches} lutas`;
    }
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
const createTournamentBracketWithBye = (atletas, categoriaInfo, currentMatchId) => {
    const participantes = [...atletas];
    console.log(`\nCriando bracket para ${participantes.length} atletas`);
    if (participantes.length === 0) {
        return { rounds: [], nextMatchId: currentMatchId };
    }
    if (participantes.length === 1) {
        return {
            rounds: [
                {
                    title: "Categoria com único participante",
                    seeds: [
                        {
                            id: currentMatchId,
                            date: new Date().toDateString(),
                            teams: [
                                {
                                    name: `${participantes[0].nome} (W.O.)`,
                                    atletaId: participantes[0].id,
                                    dojo: participantes[0].dojo.nome,
                                    idade: participantes[0].idade,
                                    peso: participantes[0].peso,
                                    dan: participantes[0].dan,
                                    kyu: participantes[0].kyu,
                                    categoria: participantes[0].categoria,
                                    categoriaKata: participantes[0].categoriaKata,
                                },
                            ],
                        },
                    ],
                },
            ],
            nextMatchId: currentMatchId + 1,
        };
    }
    const totalAtletas = participantes.length;
    const rounds = Math.ceil(Math.log2(totalAtletas));
    const atletasNoPrimeiroRound = Math.pow(2, rounds);
    const byes = atletasNoPrimeiroRound - totalAtletas;
    console.log(`  - Total de rounds: ${rounds}`);
    console.log(`  - Slots no primeiro round: ${atletasNoPrimeiroRound}`);
    console.log(`  - BYEs necessários: ${byes}`);
    const tournamentRounds = [];
    let matchId = currentMatchId;
    const firstRoundMatches = [];
    const matchToByeAtleta = new Map();
    const lutas = atletasNoPrimeiroRound / 2;
    let atletaIndex = 0;
    for (let lutaIndex = 0; lutaIndex < lutas; lutaIndex++) {
        let atleta1 = null;
        let atleta2 = null;
        if (atletaIndex < totalAtletas) {
            atleta1 = participantes[atletaIndex++];
        }
        if (atletaIndex < totalAtletas) {
            atleta2 = participantes[atletaIndex++];
        }
        const matchIdAtual = matchId++;
        if (atleta1 && atleta2) {
            firstRoundMatches.push({
                id: matchIdAtual,
                date: new Date().toDateString(),
                teams: [
                    {
                        name: atleta1.nome,
                        atletaId: atleta1.id,
                        dojo: atleta1.dojo.nome,
                        idade: atleta1.idade,
                        peso: atleta1.peso,
                        dan: atleta1.dan,
                        kyu: atleta1.kyu,
                        categoria: atleta1.categoria,
                        categoriaKata: atleta1.categoriaKata,
                    },
                    {
                        name: atleta2.nome,
                        atletaId: atleta2.id,
                        dojo: atleta2.dojo.nome,
                        idade: atleta2.idade,
                        peso: atleta2.peso,
                        dan: atleta2.dan,
                        kyu: atleta2.kyu,
                        categoria: atleta2.categoria,
                        categoriaKata: atleta2.categoriaKata,
                    },
                ],
            });
            console.log(`    -> Luta ${lutaIndex + 1}: ${atleta1.nome} vs ${atleta2.nome}`);
        }
        else if (atleta1 && !atleta2) {
            matchToByeAtleta.set(lutaIndex, atleta1);
            firstRoundMatches.push({
                id: matchIdAtual,
                date: new Date().toDateString(),
                teams: [
                    {
                        name: atleta1.nome,
                        atletaId: atleta1.id,
                        dojo: atleta1.dojo.nome,
                        idade: atleta1.idade,
                        peso: atleta1.peso,
                        dan: atleta1.dan,
                        kyu: atleta1.kyu,
                        categoria: atleta1.categoria,
                        categoriaKata: atleta1.categoriaKata,
                    },
                    { name: "--- Sem competidor ---" },
                ],
            });
            console.log(`    -> Luta ${lutaIndex + 1}: ${atleta1.nome} recebeu BYE`);
        }
        else {
            firstRoundMatches.push({
                id: matchIdAtual,
                date: new Date().toDateString(),
                teams: [
                    { name: "--- Sem competidor ---" },
                    { name: "--- Sem competidor ---" },
                ],
            });
        }
    }
    const firstRoundTitle = getRoundTitle(lutas);
    tournamentRounds.push({
        title: firstRoundTitle,
        seeds: firstRoundMatches,
    });
    let previousMatches = firstRoundMatches.length;
    for (let round = 2; round <= rounds; round++) {
        const currentMatches = Math.floor(previousMatches / 2);
        const roundMatches = [];
        for (let matchIndex = 0; matchIndex < currentMatches; matchIndex++) {
            const matchIdAtual = matchId++;
            if (round === 2) {
                const primeiraLuta1 = matchIndex * 2;
                const primeiraLuta2 = matchIndex * 2 + 1;
                const atletaComBye1 = matchToByeAtleta.get(primeiraLuta1);
                const atletaComBye2 = matchToByeAtleta.get(primeiraLuta2);
                if (atletaComBye1 && !atletaComBye2) {
                    roundMatches.push({
                        id: matchIdAtual,
                        date: new Date().toDateString(),
                        teams: [
                            {
                                name: `${atletaComBye1.nome} (Passou direto)`,
                                atletaId: atletaComBye1.id,
                                dojo: atletaComBye1.dojo.nome,
                                idade: atletaComBye1.idade,
                                peso: atletaComBye1.peso,
                                dan: atletaComBye1.dan,
                                kyu: atletaComBye1.kyu,
                                categoria: atletaComBye1.categoria,
                                categoriaKata: atletaComBye1.categoriaKata,
                            },
                            { name: "" },
                        ],
                    });
                    console.log(`    -> ${atletaComBye1.nome} passou automaticamente para ${getRoundTitle(currentMatches)}`);
                }
                else if (!atletaComBye1 && atletaComBye2) {
                    roundMatches.push({
                        id: matchIdAtual,
                        date: new Date().toDateString(),
                        teams: [
                            { name: "" },
                            {
                                name: `${atletaComBye2.nome} (Passou direto)`,
                                atletaId: atletaComBye2.id,
                                dojo: atletaComBye2.dojo.nome,
                                idade: atletaComBye2.idade,
                                peso: atletaComBye2.peso,
                                dan: atletaComBye2.dan,
                                kyu: atletaComBye2.kyu,
                                categoria: atletaComBye2.categoria,
                                categoriaKata: atletaComBye2.categoriaKata,
                            },
                        ],
                    });
                    console.log(`    -> ${atletaComBye2.nome} passou automaticamente para ${getRoundTitle(currentMatches)}`);
                }
                else if (atletaComBye1 && atletaComBye2) {
                    roundMatches.push({
                        id: matchIdAtual,
                        date: new Date().toDateString(),
                        teams: [
                            {
                                name: `${atletaComBye1.nome} (Passou direto)`,
                                atletaId: atletaComBye1.id,
                                dojo: atletaComBye1.dojo.nome,
                                idade: atletaComBye1.idade,
                                peso: atletaComBye1.peso,
                                dan: atletaComBye1.dan,
                                kyu: atletaComBye1.kyu,
                                categoria: atletaComBye1.categoria,
                                categoriaKata: atletaComBye1.categoriaKata,
                            },
                            {
                                name: `${atletaComBye2.nome} (Passou direto)`,
                                atletaId: atletaComBye2.id,
                                dojo: atletaComBye2.dojo.nome,
                                idade: atletaComBye2.idade,
                                peso: atletaComBye2.peso,
                                dan: atletaComBye2.dan,
                                kyu: atletaComBye2.kyu,
                                categoria: atletaComBye2.categoria,
                                categoriaKata: atletaComBye2.categoriaKata,
                            },
                        ],
                    });
                    console.log(`    -> ${atletaComBye1.nome} vs ${atletaComBye2.nome} (ambos passaram direto)`);
                }
                else {
                    roundMatches.push({
                        id: matchIdAtual,
                        date: new Date().toDateString(),
                        teams: [{ name: "" }, { name: "" }],
                    });
                }
            }
            else {
                roundMatches.push({
                    id: matchIdAtual,
                    date: new Date().toDateString(),
                    teams: [{ name: "" }, { name: "" }],
                });
            }
        }
        const roundTitle = getRoundTitle(currentMatches);
        tournamentRounds.push({
            title: roundTitle,
            seeds: roundMatches,
        });
        previousMatches = currentMatches;
    }
    const totalByes = matchToByeAtleta.size;
    console.log(`  - Bracket criado: ${tournamentRounds.length} rounds`);
    console.log(`  - Atletas com BYE: ${totalByes}`);
    if (totalByes > 0) {
        const nomesComBye = Array.from(matchToByeAtleta.values()).map((a) => a.nome);
        console.log(`  - Atletas que passaram direto: ${nomesComBye.join(", ")}`);
    }
    return {
        rounds: tournamentRounds,
        nextMatchId: matchId,
    };
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
            const atletasRequest = await alunoRepository.find({
                relations: ["dojo"],
            });
            console.log("Atletas encontrados:", atletasRequest.length);
            const atletas = atletasRequest.sort((a, b) => a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" }));
            console.log("==================== DEBUG COMPLETO ====================");
            console.log("Atletas encontrados:", atletas.length);
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
                    categoria: `${cat.codigo} - ${cat.categoria}`,
                    genero: cat.genero,
                    faixa: cat.faixa,
                    peso: cat.descricaoPeso || undefined,
                    totalAtletas: total,
                };
                const { rounds, nextMatchId } = createTournamentBracketWithBye(group.atletas, cat, globalMatchId);
                globalMatchId = nextMatchId;
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
                    categoria: `${cat.codigo} - ${cat.categoria}`,
                    genero: cat.genero,
                    faixa: cat.faixa,
                    peso: undefined,
                    totalAtletas: total,
                };
                const { rounds, nextMatchId } = createTournamentBracketWithBye(group.atletas, cat, globalMatchId);
                globalMatchId = nextMatchId;
                kataBrackets.push({
                    categoriaInfo,
                    rounds,
                });
            }
            console.log("\n==================== RESULTADO FINAL ====================");
            console.log(`Brackets Kumite criados: ${kumiteBrackets.length}`);
            console.log(`Brackets Kata criados: ${kataBrackets.length}`);
            const totalKumite = kumiteBrackets.reduce((acc, { categoriaInfo }) => acc + categoriaInfo.totalAtletas, 0);
            const totalKata = kataBrackets.reduce((acc, { categoriaInfo }) => acc + categoriaInfo.totalAtletas, 0);
            const totalAtletas = totalKata + totalKumite;
            console.log(`\n==================== ESTATÍSTICAS ====================`);
            console.log(`Total de atletas em Kumite: ${totalKumite}`);
            console.log(`Total de atletas em Kata: ${totalKata}`);
            console.log(`Total geral de atletas: ${totalAtletas}`);
            console.log(`Total de matches criados: ${globalMatchId - 1}`);
            kumiteBrackets.forEach((bracket, index) => {
                console.log(`\nKumite Bracket ${index + 1}:`);
                console.log(`  - Categoria: ${bracket.categoriaInfo.categoria}`);
                console.log(`  - Atletas: ${bracket.categoriaInfo.totalAtletas}`);
                console.log(`  - Rounds: ${bracket.rounds.length}`);
                if (bracket.rounds.length > 0) {
                    const byeMatches = bracket.rounds[0].seeds.filter((seed) => seed.teams.some((team) => team.name.includes("BYE"))).length;
                    if (byeMatches > 0) {
                        console.log(`  - BYEs no primeiro round: ${byeMatches}`);
                    }
                }
            });
            kataBrackets.forEach((bracket, index) => {
                console.log(`\nKata Bracket ${index + 1}:`);
                console.log(`  - Categoria: ${bracket.categoriaInfo.categoria}`);
                console.log(`  - Atletas: ${bracket.categoriaInfo.totalAtletas}`);
                console.log(`  - Rounds: ${bracket.rounds.length}`);
                if (bracket.rounds.length > 0) {
                    const byeMatches = bracket.rounds[0].seeds.filter((seed) => seed.teams.some((team) => team.name.includes("BYE"))).length;
                    if (byeMatches > 0) {
                        console.log(`  - BYEs no primeiro round: ${byeMatches}`);
                    }
                }
            });
            return reply.send({
                kumite: kumiteBrackets,
                kata: kataBrackets,
                totalAtletas,
                statistics: {
                    totalKumite,
                    totalKata,
                    totalMatches: globalMatchId - 1,
                    totalBrackets: kumiteBrackets.length + kataBrackets.length,
                },
            });
        }
        catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({
                error: "Erro ao processar brackets",
                details: error instanceof Error ? error.message : "Erro desconhecido",
            });
        }
    });
}
