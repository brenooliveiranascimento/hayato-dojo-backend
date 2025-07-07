"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateDojos1640000000000 = void 0;
const typeorm_1 = require("typeorm");
class CreateDojos1640000000000 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: "dojos",
            columns: [
                {
                    name: "id",
                    type: "serial",
                    isPrimary: true,
                },
                {
                    name: "nome",
                    type: "varchar",
                    length: "255",
                },
                {
                    name: "cidade",
                    type: "varchar",
                    length: "255",
                },
                {
                    name: "email",
                    type: "varchar",
                    length: "255",
                    isUnique: true,
                },
                {
                    name: "senha",
                    type: "varchar",
                    length: "255",
                },
                {
                    name: "criadoEm",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                },
                {
                    name: "atualizadoEm",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP",
                },
            ],
        }), true);
    }
    async down(queryRunner) {
        await queryRunner.dropTable("dojos");
    }
}
exports.CreateDojos1640000000000 = CreateDojos1640000000000;
