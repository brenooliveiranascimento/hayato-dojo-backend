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
