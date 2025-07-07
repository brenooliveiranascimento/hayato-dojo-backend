import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

export class CreateAlunos1640000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
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
      }),
      true
    );

    await queryRunner.createForeignKey(
      "alunos",
      new TableForeignKey({
        name: "FK_dojo_id",
        columnNames: ["dojoId"],
        referencedColumnNames: ["id"],
        referencedTableName: "dojos",
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey("alunos", "FK_dojo_id");
    await queryRunner.dropTable("alunos");
  }
}
