import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Aluno } from "./Aluno";

@Entity("dojos")
export class Dojo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  nome!: string;

  @Column({ type: "varchar", length: 255 })
  cidade!: string;

  @Column({ type: "varchar", length: 255 })
  tecnics!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255 })
  senha!: string;

  @OneToMany(() => Aluno, (aluno) => aluno.dojo)
  alunos!: Aluno[];

  @CreateDateColumn()
  criadoEm!: Date;

  @UpdateDateColumn()
  atualizadoEm!: Date;
}
