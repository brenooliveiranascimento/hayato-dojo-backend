"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCategoryKataColunm1640000000002 = void 0;
const typeorm_1 = require("typeorm");
class CreateCategoryKataColunm1640000000002 {
    async up(queryRunner) {
        await queryRunner.addColumn("alunos", new typeorm_1.TableColumn({
            name: "categoriaKata",
            type: "int",
            isNullable: true,
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropColumn("alunos", "categoriaKata");
    }
}
exports.CreateCategoryKataColunm1640000000002 = CreateCategoryKataColunm1640000000002;
