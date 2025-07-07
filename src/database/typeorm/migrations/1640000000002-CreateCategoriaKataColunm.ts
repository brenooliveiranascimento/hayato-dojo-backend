import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from "typeorm";

export class CreateCategoryKataColunm1640000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "alunos",
      new TableColumn({
        name: "categoriaKata",
        type: "int",
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("alunos", "categoriaKata");
  }
}
