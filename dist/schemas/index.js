"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginSchema = exports.DojoTecnicsSchema = exports.DojoSchema = void 0;
exports.DojoSchema = {
    type: "object",
    required: ["nome", "cidade", "email", "senha"],
    properties: {
        nome: { type: "string", minLength: 2, maxLength: 255 },
        cidade: { type: "string", minLength: 2, maxLength: 255 },
        email: { type: "string", format: "email" },
        senha: { type: "string", minLength: 6 },
    },
};
exports.DojoTecnicsSchema = {
    type: "object",
    required: ["tecnics"],
    properties: {
        tecnics: { type: "string", minLength: 1, maxLength: 255 },
    },
};
exports.LoginSchema = {
    type: "object",
    required: ["email", "senha"],
    properties: {
        email: { type: "string", format: "email" },
        senha: { type: "string", minLength: 6 },
    },
};
