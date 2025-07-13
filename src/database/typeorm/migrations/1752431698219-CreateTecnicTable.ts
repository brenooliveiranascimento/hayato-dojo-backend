import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class CreateTecnicTable1752431698219 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "dojos",
      new TableColumn({
        name: "tecnics",
        type: "varchar",
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("dojos", "tecnics");
  }
}
