import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateDojos1640000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
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
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("dojos");
  }
}
