import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { categorias } from "../config/categorias";
import { AppDataSource } from "../database/typeorm/data-source";
import { Aluno } from "../database/typeorm/entity/Aluno";

// Interfaces para tipagem
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
  console.log(
    `Procurando categoria ${tipo} com ID ${categoriaId} (tipo: ${typeof categoriaId})`
  );

  // Garantir que categoriaId seja número
  const id =
    typeof categoriaId === "string"
      ? parseInt(categoriaId as string)
      : categoriaId;

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

// Função para agrupar atletas por categoria
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

    // Criar chave única para a categoria
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

// Função para criar estrutura de torneio eliminatório
const createTournamentBracket = (
  atletas: AtletaComCategoria[],
  categoriaInfo: Categoria
): Round[] => {
  const participantes = [...atletas];
  console.log(`\nCriando bracket para ${participantes.length} atletas`);

  // Embaralhar atletas
  // for (let i = participantes.length - 1; i > 0; i--) {
  //   const j = Math.floor(Math.random() * (i + 1));
  //   [participantes[i], participantes[j]] = [participantes[j], participantes[i]];
  // }

  // Calcular número de rounds necessários
  const totalAtletas = participantes.length;
  const rounds = Math.ceil(Math.log2(totalAtletas));
  const atletasNoPrimeiroRound = Math.pow(2, rounds);
  const byes = atletasNoPrimeiroRound - totalAtletas;

  console.log(`  - Total de rounds necessários: ${rounds}`);
  console.log(
    `  - Atletas no primeiro round (com BYEs): ${atletasNoPrimeiroRound}`
  );
  console.log(`  - Número de BYEs: ${byes}`);

  const tournamentRounds: Round[] = [];
  let currentMatchId = 1;

  // Distribuir BYEs de forma mais equilibrada
  const primeiroRoundComByes: (AtletaComCategoria | null)[] = [];
  let byesDistribuidos = 0;
  let atletaIdx = 0;

  // Preencher array com atletas e BYEs distribuídos
  for (let i = 0; i < atletasNoPrimeiroRound; i++) {
    if (byesDistribuidos < byes && i % 2 === 1) {
      primeiroRoundComByes.push(null); // BYE
      byesDistribuidos++;
    } else if (atletaIdx < participantes.length) {
      primeiroRoundComByes.push(participantes[atletaIdx]);
      atletaIdx++;
    } else {
      primeiroRoundComByes.push(null); // BYE
    }
  }

  // Criar primeiro round
  const firstRoundMatches: Seed[] = [];
  for (let i = 0; i < atletasNoPrimeiroRound / 2; i++) {
    const atleta1 = primeiroRoundComByes[i * 2];
    const atleta2 = primeiroRoundComByes[i * 2 + 1];
    console.log({ atleta1 });
    const match: Seed = {
      id: currentMatchId++,
      date: new Date().toDateString(),
      teams: [
        atleta1
          ? {
              name: atleta1.nome,
              atletaId: atleta1.id,
              dojo: atleta1.dojo.nome,
              idade: atleta1.idade,
              peso: atleta1.peso,
              dan: atleta1.dan,
              kyu: atleta1.kyu,
            }
          : { name: "Sem competidor" },
        atleta2
          ? {
              name: atleta2.nome,
              atletaId: atleta2.id,
              dojo: atleta2.dojo.nome,
              idade: atleta2.idade,
              peso: atleta2.peso,
              dan: atleta2.dan,
              kyu: atleta2.kyu,
            }
          : { name: "Sem competidor" },
      ],
    };

    firstRoundMatches.push(match);
  }

  // Determinar título do primeiro round baseado no número de atletas
  let primeiroRoundTitulo = "Eliminatórias";
  if (atletasNoPrimeiroRound === 2) {
    primeiroRoundTitulo = "Final";
  } else if (atletasNoPrimeiroRound === 4) {
    primeiroRoundTitulo = "Semifinal";
  } else if (atletasNoPrimeiroRound === 8) {
    primeiroRoundTitulo = "Quartas de Final";
  } else if (atletasNoPrimeiroRound === 16) {
    primeiroRoundTitulo = "Oitavas de Final";
  } else if (atletasNoPrimeiroRound === 32) {
    primeiroRoundTitulo = "16-avos de Final";
  } else if (atletasNoPrimeiroRound === 64) {
    primeiroRoundTitulo = "32-avos de Final";
  }

  tournamentRounds.push({
    title: primeiroRoundTitulo,
    seeds: firstRoundMatches,
  });

  // Criar rounds subsequentes
  let previousRoundMatches = firstRoundMatches.length;
  for (let round = 2; round <= rounds; round++) {
    const currentRoundMatches = previousRoundMatches / 2;
    const roundMatches: Seed[] = [];

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
    } else if (currentRoundMatches === 2) {
      roundTitle = "Semifinal";
    } else if (currentRoundMatches === 4) {
      roundTitle = "Quartas de Final";
    } else if (currentRoundMatches === 8) {
      roundTitle = "Oitavas de Final";
    } else if (currentRoundMatches === 16) {
      roundTitle = "16-avos de Final";
    } else if (currentRoundMatches === 32) {
      roundTitle = "32-avos de Final";
    } else {
      roundTitle = `Round ${round}`;
    }

    tournamentRounds.push({
      title: roundTitle,
      seeds: roundMatches,
    });

    previousRoundMatches = currentRoundMatches;
  }

  // Adicionar disputa de terceiro lugar se houver pelo menos 4 atletas
  // if (totalAtletas >= 4 && rounds >= 2) {
  //   tournamentRounds.push({
  //     title: "Disputa 3º Lugar",
  //     seeds: [
  //       {
  //         id: currentMatchId++,
  //         date: new Date().toDateString(),
  //         teams: [{ name: "" }, { name: "" }],
  //       },
  //     ],
  //   });
  // }

  console.log(`  - Bracket criado com ${tournamentRounds.length} rounds`);
  return tournamentRounds;
};

// Schema de validação
// const getBracketsSchema = {
//   headers: {
//     type: "object",
//     properties: {
//       authorization: { type: "string" },
//     },
//     required: ["authorization"],
//   },
//   response: {
//     200: {
//       type: "object",
//       properties: {
//         kumite: {
//           type: "array",
//           items: {
//             type: "object",
//             properties: {
//               categoriaInfo: { type: "object" },
//               rounds: { type: "array" },
//             },
//           },
//         },
//         kata: {
//           type: "array",
//           items: {
//             type: "object",
//             properties: {
//               categoriaInfo: { type: "object" },
//               rounds: { type: "array" },
//             },
//           },
//         },
//       },
//     },
//   },
// };

// Rota Fastify
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

        // Aqui você deve validar o token com sua lógica
        // Por exemplo: const isValid = await validateToken(token);

        // Buscar atletas do banco de dados
        const atletasRequest = await alunoRepository.find({
          relations: ["dojo"],
        });

        console.log(atletasRequest);

        const atletas = atletasRequest.sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt", { sensitivity: "base" })
        );

        // const atletas = [
        //   {
        //     id: 1,
        //     nome: "João Silva",
        //     idade: 12,
        //     categoria: 49,
        //     categoriaKata: 9,
        //     peso: "42.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 1,
        //     nome: "João Silva",
        //     idade: 12,
        //     categoria: 49,
        //     categoriaKata: null,
        //     peso: "42.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 1,
        //     nome: "João Silva",
        //     idade: 12,
        //     categoria: 49,
        //     categoriaKata: null,
        //     peso: "42.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 1,
        //     nome: "João Silva",
        //     idade: 12,
        //     categoria: 49,
        //     categoriaKata: null,
        //     peso: "42.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 1,
        //     nome: "João Silva",
        //     idade: 12,
        //     categoria: 49,
        //     categoriaKata: null,
        //     peso: "42.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 1,
        //     nome: "João Silva",
        //     idade: 12,
        //     categoria: 49,
        //     categoriaKata: null,
        //     peso: "42.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 1,
        //     nome: "João Silva",
        //     idade: 12,
        //     categoria: 49,
        //     categoriaKata: null,
        //     peso: "42.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 1,
        //     nome: "João Silva",
        //     idade: 12,
        //     categoria: 49,
        //     categoriaKata: 9,
        //     peso: "42.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 1,
        //     nome: "João Silva",
        //     idade: 12,
        //     categoria: 49,
        //     categoriaKata: 9,
        //     peso: "42.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 2,
        //     nome: "Pedro Santos",
        //     idade: 11,
        //     categoria: 49,
        //     categoriaKata: 9,
        //     peso: "40.00",
        //     kyu: "4",
        //     dan: null,
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 3,
        //     nome: "Maria Oliveira",
        //     idade: 10,
        //     categoria: 50,
        //     categoriaKata: 10,
        //     peso: "38.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 4,
        //     nome: "Ana Costa",
        //     idade: 13,
        //     categoria: 51,
        //     categoriaKata: 11,
        //     peso: "48.00",
        //     kyu: "3",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 5,
        //     nome: "Lucas Pereira",
        //     idade: 14,
        //     categoria: 52,
        //     categoriaKata: 12,
        //     peso: "55.00",
        //     kyu: "2",
        //     dan: null,
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 6,
        //     nome: "Mariana Souza",
        //     idade: 9,
        //     categoria: 48,
        //     categoriaKata: 8,
        //     peso: "35.00",
        //     kyu: "6",
        //     dan: null,
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 7,
        //     nome: "Rafael Almeida",
        //     idade: 15,
        //     categoria: 53,
        //     categoriaKata: 13,
        //     peso: "60.00",
        //     kyu: "1",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 8,
        //     nome: "Sofia Mendes",
        //     idade: 16,
        //     categoria: 54,
        //     categoriaKata: 14,
        //     peso: "58.00",
        //     kyu: null,
        //     dan: "1",
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 9,
        //     nome: "Daniel Lima",
        //     idade: 17,
        //     categoria: 55,
        //     categoriaKata: 15,
        //     peso: "65.00",
        //     kyu: null,
        //     dan: "2",
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 10,
        //     nome: "Beatriz Ribeiro",
        //     idade: 18,
        //     categoria: 56,
        //     categoriaKata: 16,
        //     peso: "62.00",
        //     kyu: null,
        //     dan: "1",
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 11,
        //     nome: "Felipe Martins",
        //     idade: 8,
        //     categoria: 47,
        //     categoriaKata: 7,
        //     peso: "30.00",
        //     kyu: "7",
        //     dan: null,
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 12,
        //     nome: "Gabriela Fernandes",
        //     idade: 19,
        //     categoria: 57,
        //     categoriaKata: 17,
        //     peso: "68.00",
        //     kyu: null,
        //     dan: "3",
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 13,
        //     nome: "Artur Gomes",
        //     idade: 20,
        //     categoria: 58,
        //     categoriaKata: 18,
        //     peso: "75.00",
        //     kyu: null,
        //     dan: "4",
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 14,
        //     nome: "Helena Rocha",
        //     idade: 21,
        //     categoria: 59,
        //     categoriaKata: 19,
        //     peso: "70.00",
        //     kyu: null,
        //     dan: "3",
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 15,
        //     nome: "Guilherme Castro",
        //     idade: 22,
        //     categoria: 60,
        //     categoriaKata: 20,
        //     peso: "80.00",
        //     kyu: null,
        //     dan: "5",
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 16,
        //     nome: "Julia Correia",
        //     idade: 11,
        //     categoria: 50,
        //     categoriaKata: 10,
        //     peso: "40.00",
        //     kyu: "4",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 17,
        //     nome: "Bruno Alves",
        //     idade: 13,
        //     categoria: 51,
        //     categoriaKata: 11,
        //     peso: "50.00",
        //     kyu: "3",
        //     dan: null,
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 18,
        //     nome: "Laura Costa",
        //     idade: 15,
        //     categoria: 52,
        //     categoriaKata: 12,
        //     peso: "52.00",
        //     kyu: "2",
        //     dan: null,
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 19,
        //     nome: "Thiago Dantas",
        //     idade: 16,
        //     categoria: 53,
        //     categoriaKata: 13,
        //     peso: "62.00",
        //     kyu: "1",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 20,
        //     nome: "Catarina Fonseca",
        //     idade: 17,
        //     categoria: 54,
        //     categoriaKata: 14,
        //     peso: "60.00",
        //     kyu: null,
        //     dan: "1",
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 21,
        //     nome: "Diego Moraes",
        //     idade: 18,
        //     categoria: 55,
        //     categoriaKata: 15,
        //     peso: "70.00",
        //     kyu: null,
        //     dan: "2",
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 22,
        //     nome: "Luiza Nobrega",
        //     idade: 19,
        //     categoria: 56,
        //     categoriaKata: 16,
        //     peso: "65.00",
        //     kyu: null,
        //     dan: "1",
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 23,
        //     nome: "Enzo Pires",
        //     idade: 20,
        //     categoria: 57,
        //     categoriaKata: 17,
        //     peso: "78.00",
        //     kyu: null,
        //     dan: "3",
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 24,
        //     nome: "Vitoria Queiroz",
        //     idade: 21,
        //     categoria: 58,
        //     categoriaKata: 18,
        //     peso: "72.00",
        //     kyu: null,
        //     dan: "4",
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 25,
        //     nome: "Leonardo Rocha",
        //     idade: 22,
        //     categoria: 59,
        //     categoriaKata: 19,
        //     peso: "85.00",
        //     kyu: null,
        //     dan: "3",
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 26,
        //     nome: "Manuela Santos",
        //     idade: 23,
        //     categoria: 60,
        //     categoriaKata: 20,
        //     peso: "75.00",
        //     kyu: null,
        //     dan: "5",
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 27,
        //     nome: "Carlos Eduardo",
        //     idade: 10,
        //     categoria: 49,
        //     categoriaKata: 9,
        //     peso: "39.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 28,
        //     nome: "Isabela Martins",
        //     idade: 12,
        //     categoria: 50,
        //     categoriaKata: 10,
        //     peso: "43.00",
        //     kyu: "4",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 29,
        //     nome: "Miguel Dias",
        //     idade: 14,
        //     categoria: 51,
        //     categoriaKata: 11,
        //     peso: "52.00",
        //     kyu: "3",
        //     dan: null,
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 30,
        //     nome: "Clara Guedes",
        //     idade: 16,
        //     categoria: 52,
        //     categoriaKata: 12,
        //     peso: "57.00",
        //     kyu: "2",
        //     dan: null,
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 31,
        //     nome: "João Victor",
        //     idade: 18,
        //     categoria: 53,
        //     categoriaKata: 13,
        //     peso: "68.00",
        //     kyu: "1",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 32,
        //     nome: "Sophia Viana",
        //     idade: 20,
        //     categoria: 54,
        //     categoriaKata: 14,
        //     peso: "63.00",
        //     kyu: null,
        //     dan: "1",
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 33,
        //     nome: "Arthur Ferreira",
        //     idade: 22,
        //     categoria: 55,
        //     categoriaKata: 15,
        //     peso: "72.00",
        //     kyu: null,
        //     dan: "2",
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 34,
        //     nome: "Isadora Lima",
        //     idade: 24,
        //     categoria: 56,
        //     categoriaKata: 16,
        //     peso: "68.00",
        //     kyu: null,
        //     dan: "1",
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 35,
        //     nome: "Bernardo Costa",
        //     idade: 26,
        //     categoria: 57,
        //     categoriaKata: 17,
        //     peso: "80.00",
        //     kyu: null,
        //     dan: "3",
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 36,
        //     nome: "Luana Ribeiro",
        //     idade: 28,
        //     categoria: 58,
        //     categoriaKata: 18,
        //     peso: "75.00",
        //     kyu: null,
        //     dan: "4",
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 37,
        //     nome: "Eduardo Souza",
        //     idade: 30,
        //     categoria: 59,
        //     categoriaKata: 19,
        //     peso: "90.00",
        //     kyu: null,
        //     dan: "3",
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 38,
        //     nome: "Valentina Dutra",
        //     idade: 32,
        //     categoria: 60,
        //     categoriaKata: 20,
        //     peso: "82.00",
        //     kyu: null,
        //     dan: "5",
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 39,
        //     nome: "Lorenzo Neves",
        //     idade: 9,
        //     categoria: 48,
        //     categoriaKata: 8,
        //     peso: "36.00",
        //     kyu: "6",
        //     dan: null,
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 40,
        //     nome: "Alice Santos",
        //     idade: 11,
        //     categoria: 49,
        //     categoriaKata: 9,
        //     peso: "41.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 41,
        //     nome: "Gustavo Rocha",
        //     idade: 13,
        //     categoria: 50,
        //     categoriaKata: 10,
        //     peso: "47.00",
        //     kyu: "4",
        //     dan: null,
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 42,
        //     nome: "Carolina Souza",
        //     idade: 15,
        //     categoria: 51,
        //     categoriaKata: 11,
        //     peso: "54.00",
        //     kyu: "3",
        //     dan: null,
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 43,
        //     nome: "Lucas Pereira",
        //     idade: 17,
        //     categoria: 52,
        //     categoriaKata: 12,
        //     peso: "60.00",
        //     kyu: "2",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 44,
        //     nome: "Heloisa Mendes",
        //     idade: 19,
        //     categoria: 53,
        //     categoriaKata: 13,
        //     peso: "59.00",
        //     kyu: "1",
        //     dan: null,
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 45,
        //     nome: "Nicolas Lima",
        //     idade: 21,
        //     categoria: 54,
        //     categoriaKata: 14,
        //     peso: "70.00",
        //     kyu: null,
        //     dan: "1",
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 46,
        //     nome: "Giovanna Silva",
        //     idade: 23,
        //     categoria: 55,
        //     categoriaKata: 15,
        //     peso: "66.00",
        //     kyu: null,
        //     dan: "2",
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 47,
        //     nome: "João Lucas",
        //     idade: 25,
        //     categoria: 56,
        //     categoriaKata: 16,
        //     peso: "75.00",
        //     kyu: null,
        //     dan: "1",
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 48,
        //     nome: "Maria Clara",
        //     idade: 27,
        //     categoria: 57,
        //     categoriaKata: 17,
        //     peso: "70.00",
        //     kyu: null,
        //     dan: "3",
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 49,
        //     nome: "Pedro Henrique",
        //     idade: 29,
        //     categoria: 58,
        //     categoriaKata: 18,
        //     peso: "88.00",
        //     kyu: null,
        //     dan: "4",
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 50,
        //     nome: "Sophia Lima",
        //     idade: 31,
        //     categoria: 59,
        //     categoriaKata: 19,
        //     peso: "78.00",
        //     kyu: null,
        //     dan: "3",
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 51,
        //     nome: "Davi Luiz",
        //     idade: 33,
        //     categoria: 60,
        //     categoriaKata: 20,
        //     peso: "95.00",
        //     kyu: null,
        //     dan: "5",
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 52,
        //     nome: "Manuela Dias",
        //     idade: 10,
        //     categoria: 48,
        //     categoriaKata: 8,
        //     peso: "37.00",
        //     kyu: "6",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 53,
        //     nome: "Arthur Nogueira",
        //     idade: 12,
        //     categoria: 49,
        //     categoriaKata: 9,
        //     peso: "43.00",
        //     kyu: "5",
        //     dan: null,
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 54,
        //     nome: "Julia Pires",
        //     idade: 14,
        //     categoria: 50,
        //     categoriaKata: 10,
        //     peso: "49.00",
        //     kyu: "4",
        //     dan: null,
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 55,
        //     nome: "Matheus Queiroz",
        //     idade: 16,
        //     categoria: 51,
        //     categoriaKata: 11,
        //     peso: "56.00",
        //     kyu: "3",
        //     dan: null,
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 56,
        //     nome: "Laura Ribeiro",
        //     idade: 18,
        //     categoria: 52,
        //     categoriaKata: 12,
        //     peso: "61.00",
        //     kyu: "2",
        //     dan: null,
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 57,
        //     nome: "Enzo Santos",
        //     idade: 20,
        //     categoria: 53,
        //     categoriaKata: 13,
        //     peso: "72.00",
        //     kyu: "1",
        //     dan: null,
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 58,
        //     nome: "Maria Luiza",
        //     idade: 22,
        //     categoria: 54,
        //     categoriaKata: 14,
        //     peso: "67.00",
        //     kyu: null,
        //     dan: "1",
        //     dojoId: 2,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 59,
        //     nome: "Gabriel Vieira",
        //     idade: 24,
        //     categoria: 55,
        //     categoriaKata: 15,
        //     peso: "77.00",
        //     kyu: null,
        //     dan: "2",
        //     dojoId: 1,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        //   {
        //     id: 60,
        //     nome: "Helena Alves",
        //     idade: 26,
        //     categoria: 56,
        //     categoriaKata: 16,
        //     peso: "72.00",
        //     kyu: null,
        //     dan: "1",
        //     dojoId: 3,
        //     criadoEm: "2025-07-07T23:21:06.234Z",
        //     atualizadoEm: "2025-07-07T23:21:06.234Z",
        //   },
        // ];

        console.log("==================== DEBUG COMPLETO ====================");
        console.log("Atletas encontrados:", atletas.length);
        if (atletas.length > 0) {
          console.log(
            "Estrutura completa do primeiro atleta:",
            JSON.stringify(atletas[0], null, 2)
          );
          console.log("Tipos dos campos do primeiro atleta:");
          console.log("  - id:", typeof atletas[0].id, "valor:", atletas[0].id);
          console.log(
            "  - nome:",
            typeof atletas[0].nome,
            "valor:",
            atletas[0].nome
          );
          console.log(
            "  - categoria:",
            typeof atletas[0].categoria,
            "valor:",
            atletas[0].categoria
          );
          console.log(
            "  - categoriaKata:",
            typeof atletas[0].categoriaKata,
            "valor:",
            atletas[0].categoriaKata
          );
          console.log(
            "  - peso:",
            typeof atletas[0].peso,
            "valor:",
            atletas[0].peso
          );
        }

        // Agrupar atletas por categoria
        const kumiteGroups = groupAthletesByCategory(atletas, "kumite");
        const kataGroups = groupAthletesByCategory(atletas, "kata");

        // Criar brackets para cada categoria
        const kumiteBrackets: BracketGroup[] = [];
        const kataBrackets: BracketGroup[] = [];

        // Processar categorias de Kumite
        let globalMatchId = 1;

        // Processar categorias de Kumite (mesma ideia vale para Kata)
        for (const [key, group] of Object.entries(kumiteGroups)) {
          const total = group.atletas.length;

          // monta a categoriaInfo incluindo o nome
          const cat = group.categoria;
          const categoriaInfo: CategoriaInfo = {
            tipo: "kumite",
            categoria: `${cat.codigo} - ${cat.categoria}` || key, // fallback para key
            genero: cat.genero,
            faixa: cat.faixa,
            peso: cat.descricaoPeso || undefined,
            totalAtletas: total,
          };

          // cria os rounds conforme nº de atletas
          let rounds: Round[];
          if (total > 1) {
            // bracket normal
            rounds = createTournamentBracket(group.atletas, cat);
          } else {
            // apenas 1 atleta: criamos um round único
            const atleta = group.atletas[0];
            rounds = [
              {
                title: "Categoria com único participante",
                seeds: [
                  {
                    id: globalMatchId++,
                    date: new Date().toDateString(),
                    teams: [
                      {
                        name: atleta.nome,
                        atletaId: atleta.id,
                        dojo: atleta.nome,
                        idade: atleta.idade,
                        peso: atleta.peso,
                        dan: atleta.dan,
                        kyu: atleta.kyu,
                      },
                    ],
                  },
                ],
              },
            ];
          }

          // finalmente empurra no array de saída
          kumiteBrackets.push({
            categoriaInfo,
            rounds,
          });
        }

        // Faça a mesma coisa para kataGroups...
        for (const [key, group] of Object.entries(kataGroups)) {
          const total = group.atletas.length;
          const cat = group.categoria;
          const categoriaInfo: CategoriaInfo = {
            tipo: "kata",
            categoria: `${cat.codigo} - ${cat.categoria}` || key, // fallback para key
            genero: cat.genero,
            faixa: cat.faixa,
            peso: undefined,
            totalAtletas: total,
          };

          let rounds: Round[];
          if (total > 1) {
            rounds = createTournamentBracket(group.atletas, cat);
          } else {
            const atleta = group.atletas[0];
            rounds = [
              {
                title: "Categoria com único participante",
                seeds: [
                  {
                    id: globalMatchId++,
                    date: new Date().toDateString(),
                    teams: [
                      {
                        name: atleta.nome,
                        atletaId: atleta.id,
                        dojo: atleta.dojo.nome,
                      },
                    ],
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

        console.log(
          "\n==================== RESULTADO FINAL ===================="
        );
        console.log(`Brackets Kumite criados: ${kumiteBrackets.length}`);
        console.log(`Brackets Kata criados: ${kataBrackets.length}`);

        // Se não houver brackets, vamos criar um exemplo para teste
        if (
          kumiteBrackets.length === 0 &&
          kataBrackets.length === 0 &&
          atletas.length > 0
        ) {
          console.log(
            "\nNENHUM BRACKET FOI CRIADO! Verificando possíveis problemas:"
          );
          console.log(
            "1. Os IDs de categoria dos atletas podem não corresponder aos códigos definidos"
          );
          console.log(
            "2. Os campos categoria/categoriaKata podem estar null ou undefined"
          );
          console.log("3. Pode haver apenas 1 atleta por categoria");

          // Listar categorias únicas dos atletas
          const categoriasKumiteUsadas = new Set(
            atletas.map((a) => a.categoria).filter((c) => c != null)
          );
          const categoriasKataUsadas = new Set(
            atletas.map((a) => a.categoriaKata).filter((c) => c != null)
          );

          console.log(
            "\nCategorias Kumite nos atletas:",
            Array.from(categoriasKumiteUsadas)
          );
          console.log(
            "Categorias Kata nos atletas:",
            Array.from(categoriasKataUsadas)
          );
        }

        console.log(
          JSON.stringify(
            { kumite: kumiteBrackets, kata: kataBrackets },
            null,
            2
          )
        );

        return reply.send({
          kumite: kumiteBrackets,
          kata: kataBrackets,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: "Erro ao processar brackets" });
      }
    }
  );
}
