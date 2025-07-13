"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTecnicTable1752431698219 = void 0;
const typeorm_1 = require("typeorm");
class CreateTecnicTable1752431698219 {
    async up(queryRunner) {
        await queryRunner.addColumn("dojos", new typeorm_1.TableColumn({
            name: "tecnics",
            type: "varchar",
            isNullable: true,
        }));
    }
    async down(queryRunner) {
        await queryRunner.dropColumn("dojos", "tecnics");
    }
}
exports.CreateTecnicTable1752431698219 = CreateTecnicTable1752431698219;
