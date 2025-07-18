import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { categorias } from "../config/categorias";
import { AppDataSource } from "../database/typeorm/data-source";
import { Aluno } from "../database/typeorm/entity/Aluno";

// Suas interfaces existentes...
interface Categoria {
  codigo: number;
  idadeMin: number;
  idadeMax: number;
  categoria: string;
  genero: string;
  faixa: string;
  pesoMin?: number;
  pesoMax?: number;
  descricaoPeso?: string;
}

interface Team {
  name: string;
  atletaId?: number;
  dojo?: string;
  idade?: number;
  peso?: number;
  kyu?: string;
  dan?: string;
  categoria?: number;
  categoriaKata?: number;
}

interface Seed {
  id: number;
  date: string;
  teams: Team[];
}

interface Round {
  title: string;
  seeds: Seed[];
}

interface CategoriaInfo {
  tipo: string;
  categoria: string;
  genero: string;
  faixa: string;
  peso?: string;
  totalAtletas: number;
}

interface BracketGroup {
  categoriaInfo: CategoriaInfo;
  rounds: Round[];
}

interface AtletaComCategoria extends Aluno {
  categoriaInfo: Categoria;
}

interface GroupedCategory {
  categoria: Categoria;
  atletas: AtletaComCategoria[];
}

// Função auxiliar para encontrar a categoria
const findCategoria = (
  tipo: "kumite" | "kata",
  categoriaId: number
): Categoria | undefined => {
  console.log(`Procurando categoria ${tipo} com ID ${categoriaId}`);

  const id =
    typeof categoriaId === "string" ? parseInt(categoriaId) : categoriaId;
  const categoria = categorias[tipo].find(
    (cat: Categoria) => cat.codigo === id
  );

  if (!categoria) {
    console.log(
      `Categoria não encontrada. IDs disponíveis para ${tipo}:`,
      categorias[tipo].map((c: Categoria) => c.codigo).join(", ")
    );
  }

  return categoria;
};

// Função auxiliar para determinar o título do round
const getRoundTitle = (numberOfMatches: number): string => {
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

// Função para agrupar atletas por categoria (mantida igual)
const groupAthletesByCategory = (
  atletas: Aluno[],
  tipo: "kumite" | "kata"
): Record<string, GroupedCategory> => {
  const grouped: Record<string, GroupedCategory> = {};

  console.log(`\nAgrupando atletas para ${tipo}:`);

  atletas.forEach((atleta) => {
    const categoriaId =
      tipo === "kumite" ? atleta.categoria : atleta.categoriaKata;

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

    const atletaComCategoria: AtletaComCategoria = {
      ...atleta,
      categoriaInfo: categoria,
    };

    grouped[key].atletas.push(atletaComCategoria);
  });

  return grouped;
};

// NOVA FUNÇÃO CORRIGIDA: Criar torneio com sistema de BYE correto
const createTournamentBracketWithBye = (
  atletas: AtletaComCategoria[],
  categoriaInfo: Categoria,
  currentMatchId: number
): { rounds: Round[]; nextMatchId: number } => {
  const participantes = [...atletas];
  console.log(`\nCriando bracket para ${participantes.length} atletas`);

  if (participantes.length === 0) {
    return { rounds: [], nextMatchId: currentMatchId };
  }

  if (participantes.length === 1) {
    // Caso especial: apenas 1 atleta
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

  // Embaralhar atletas para distribuição mais justa
  // for (let i = participantes.length - 1; i > 0; i--) {
  //   const j = Math.floor(Math.random() * (i + 1));
  //   [participantes[i], participantes[j]] = [participantes[j], participantes[i]];
  // }

  const tournamentRounds: Round[] = [];
  let matchId = currentMatchId;

  // === PRIMEIRA RODADA ===
  const firstRoundMatches: Seed[] = [];
  const matchToByeAtleta: Map<number, AtletaComCategoria> = new Map(); // Mapear match -> atleta com BYE

  // Distribuir atletas nas lutas da primeira rodada
  const lutas = atletasNoPrimeiroRound / 2;
  let atletaIndex = 0;

  for (let lutaIndex = 0; lutaIndex < lutas; lutaIndex++) {
    let atleta1: AtletaComCategoria | null = null;
    let atleta2: AtletaComCategoria | null = null;

    // Tentar pegar dois atletas para a luta
    if (atletaIndex < totalAtletas) {
      atleta1 = participantes[atletaIndex++];
    }
    if (atletaIndex < totalAtletas) {
      atleta2 = participantes[atletaIndex++];
    }

    const matchIdAtual = matchId++;

    if (atleta1 && atleta2) {
      // Luta normal entre dois atletas
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
      console.log(
        `    -> Luta ${lutaIndex + 1}: ${atleta1.nome} vs ${atleta2.nome}`
      );
    } else if (atleta1 && !atleta2) {
      // Atleta 1 recebe BYE
      matchToByeAtleta.set(lutaIndex, atleta1); // Mapear posição da luta -> atleta com BYE
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
    } else {
      // Não deveria acontecer com a lógica atual, mas vamos tratar
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

  // Adicionar primeiro round
  const firstRoundTitle = getRoundTitle(lutas);
  tournamentRounds.push({
    title: firstRoundTitle,
    seeds: firstRoundMatches,
  });

  // === ROUNDS SUBSEQUENTES ===
  let previousMatches = firstRoundMatches.length;

  for (let round = 2; round <= rounds; round++) {
    const currentMatches = Math.floor(previousMatches / 2);
    const roundMatches: Seed[] = [];

    for (let matchIndex = 0; matchIndex < currentMatches; matchIndex++) {
      const matchIdAtual = matchId++;

      if (round === 2) {
        // No segundo round, precisamos verificar se alguma das lutas da primeira rodada tinha BYE
        const primeiraLuta1 = matchIndex * 2; // Primeira luta que alimenta esta posição
        const primeiraLuta2 = matchIndex * 2 + 1; // Segunda luta que alimenta esta posição

        const atletaComBye1 = matchToByeAtleta.get(primeiraLuta1);
        const atletaComBye2 = matchToByeAtleta.get(primeiraLuta2);

        if (atletaComBye1 && !atletaComBye2) {
          // Atleta da primeira luta teve BYE, vai direto para esta posição
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
          console.log(
            `    -> ${
              atletaComBye1.nome
            } passou automaticamente para ${getRoundTitle(currentMatches)}`
          );
        } else if (!atletaComBye1 && atletaComBye2) {
          // Atleta da segunda luta teve BYE, vai direto para esta posição
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
          console.log(
            `    -> ${
              atletaComBye2.nome
            } passou automaticamente para ${getRoundTitle(currentMatches)}`
          );
        } else if (atletaComBye1 && atletaComBye2) {
          // Ambos tiveram BYE (caso muito raro), fazer luta entre eles
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
          console.log(
            `    -> ${atletaComBye1.nome} vs ${atletaComBye2.nome} (ambos passaram direto)`
          );
        } else {
          // Luta normal aguardando vencedores
          roundMatches.push({
            id: matchIdAtual,
            date: new Date().toDateString(),
            teams: [{ name: "" }, { name: "" }],
          });
        }
      } else {
        // Rounds normais (3º em diante) - apenas aguardar vencedores
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
    const nomesComBye = Array.from(matchToByeAtleta.values()).map(
      (a) => a.nome
    );
    console.log(`  - Atletas que passaram direto: ${nomesComBye.join(", ")}`);
  }

  return {
    rounds: tournamentRounds,
    nextMatchId: matchId,
  };
};

// Rota Fastify com a nova lógica corrigida
export default async function bracketRoutes(fastify: FastifyInstance) {
  // Rota para listar todas as categorias disponíveis
  fastify.get(
    "/api/categorias",
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({
        kata: categorias.kata.map((cat) => ({
          id: cat.codigo,
          categoria: cat.categoria,
          genero: cat.genero,
          faixa: cat.faixa,
          idadeMin: cat.idadeMin,
          idadeMax: cat.idadeMax,
        })),
        kumite: categorias.kumite.map((cat) => ({
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
    }
  );

  fastify.get(
    "/api/brackets",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const alunoRepository = AppDataSource.getRepository(Aluno);

        // Validar token
        const token = request.headers.authorization;
        if (!token) {
          return reply.code(401).send({ error: "Token não fornecido" });
        }

        // Buscar atletas do banco de dados
        const atletasRequest = await alunoRepository.find({
          relations: ["dojo"],
        });

        console.log("Atletas encontrados:", atletasRequest.length);

        const atletas = atletasRequest.sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" })
        );

        console.log("==================== DEBUG COMPLETO ====================");
        console.log("Atletas encontrados:", atletas.length);

        // Agrupar atletas por categoria
        const kumiteGroups = groupAthletesByCategory(atletas, "kumite");
        const kataGroups = groupAthletesByCategory(atletas, "kata");

        // Criar brackets para cada categoria
        const kumiteBrackets: BracketGroup[] = [];
        const kataBrackets: BracketGroup[] = [];

        // Contador global de matches para manter IDs únicos
        let globalMatchId = 1;

        // Processar categorias de Kumite com lógica corrigida
        for (const [key, group] of Object.entries(kumiteGroups)) {
          const total = group.atletas.length;
          const cat = group.categoria;

          const categoriaInfo: CategoriaInfo = {
            tipo: "kumite",
            categoria: `${cat.codigo} - ${cat.categoria}`,
            genero: cat.genero,
            faixa: cat.faixa,
            peso: cat.descricaoPeso || undefined,
            totalAtletas: total,
          };

          const { rounds, nextMatchId } = createTournamentBracketWithBye(
            group.atletas,
            cat,
            globalMatchId
          );
          globalMatchId = nextMatchId;

          kumiteBrackets.push({
            categoriaInfo,
            rounds,
          });
        }

        // Processar categorias de Kata com lógica corrigida
        for (const [key, group] of Object.entries(kataGroups)) {
          const total = group.atletas.length;
          const cat = group.categoria;

          const categoriaInfo: CategoriaInfo = {
            tipo: "kata",
            categoria: `${cat.codigo} - ${cat.categoria}`,
            genero: cat.genero,
            faixa: cat.faixa,
            peso: undefined,
            totalAtletas: total,
          };

          const { rounds, nextMatchId } = createTournamentBracketWithBye(
            group.atletas,
            cat,
            globalMatchId
          );
          globalMatchId = nextMatchId;

          kataBrackets.push({
            categoriaInfo,
            rounds,
          });
        }

        console.log(
          "\n==================== RESULTADO FINAL ===================="
        );
        console.log(`Brackets Kumite criados: ${kumiteBrackets.length}`);
        console.log(`Brackets Kata criados: ${kataBrackets.length}`);

        // Calcular totais
        const totalKumite = kumiteBrackets.reduce(
          (acc, { categoriaInfo }) => acc + categoriaInfo.totalAtletas,
          0
        );

        const totalKata = kataBrackets.reduce(
          (acc, { categoriaInfo }) => acc + categoriaInfo.totalAtletas,
          0
        );

        const totalAtletas = totalKata + totalKumite;

        // Log de estatísticas finais
        console.log(`\n==================== ESTATÍSTICAS ====================`);
        console.log(`Total de atletas em Kumite: ${totalKumite}`);
        console.log(`Total de atletas em Kata: ${totalKata}`);
        console.log(`Total geral de atletas: ${totalAtletas}`);
        console.log(`Total de matches criados: ${globalMatchId - 1}`);

        // Log detalhado dos brackets criados
        kumiteBrackets.forEach((bracket, index) => {
          console.log(`\nKumite Bracket ${index + 1}:`);
          console.log(`  - Categoria: ${bracket.categoriaInfo.categoria}`);
          console.log(`  - Atletas: ${bracket.categoriaInfo.totalAtletas}`);
          console.log(`  - Rounds: ${bracket.rounds.length}`);

          // Contar BYEs no primeiro round
          if (bracket.rounds.length > 0) {
            const byeMatches = bracket.rounds[0].seeds.filter((seed) =>
              seed.teams.some((team) => team.name.includes("BYE"))
            ).length;
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

          // Contar BYEs no primeiro round
          if (bracket.rounds.length > 0) {
            const byeMatches = bracket.rounds[0].seeds.filter((seed) =>
              seed.teams.some((team) => team.name.includes("BYE"))
            ).length;
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
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: "Erro ao processar brackets",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }
  );
}
