export const DojoSchema = {
  type: "object",
  required: ["nome", "cidade", "email", "senha"],
  properties: {
    nome: { type: "string", minLength: 2, maxLength: 255 },
    cidade: { type: "string", minLength: 2, maxLength: 255 },
    email: { type: "string", format: "email" },
    senha: { type: "string", minLength: 6 },
  },
};

export const DojoTecnicsSchema = {
  type: "object",
  required: ["tecnics"],
  properties: {
    tecnics: { type: "string", minLength: 1, maxLength: 255 },
  },
};

export const LoginSchema = {
  type: "object",
  required: ["email", "senha"],
  properties: {
    email: { type: "string", format: "email" },
    senha: { type: "string", minLength: 6 },
  },
};

export const AlunoSchema = {
  type: "object",
  required: ["nome", "idade", "peso"],
  properties: {
    nome: { type: "string", minLength: 2, maxLength: 255 },
    idade: { type: "integer", minimum: 5, maximum: 100 },
    peso: { type: "number", minimum: 20, maximum: 200 },
    kyu: { type: "string", maxLength: 50 },
    dan: { type: "string", maxLength: 50 },
    categoria: { type: "integer" },
    categoriaKata: { type: "integer" },
  },
};
