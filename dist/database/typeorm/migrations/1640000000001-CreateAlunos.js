"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAlunos1640000000001 = void 0;
const typeorm_1 = require("typeorm");
class CreateAlunos1640000000001 {
    async up(queryRunner) {
        await queryRunner.createTable(new typeorm_1.Table({
            name: "alunos",
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
                    name: "idade",
                    type: "int",
                },
                {
                    name: "categoria",
                    type: "int",
                },
                {
                    name: "peso",
                    type: "decimal",
                    precision: 5,
                    scale: 2,
                },
                {
                    name: "kyu",
                    type: "varchar",
                    length: "50",
                    isNullable: true,
                },
                {
                    name: "dan",
                    type: "varchar",
                    length: "50",
                    isNullable: true,
                },
                {
                    name: "dojoId",
                    type: "int",
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
        await queryRunner.createForeignKey("alunos", new typeorm_1.TableForeignKey({
            name: "FK_dojo_id",
            columnNames: ["dojoId"],
            referencedColumnNames: ["id"],
            referencedTableName: "dojos",
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropForeignKey("alunos", "FK_dojo_id");
        await queryRunner.dropTable("alunos");
    }
}
exports.CreateAlunos1640000000001 = CreateAlunos1640000000001;
