import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Dojo } from "./Dojo";

@Entity("alunos")
export class Aluno {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  nome: string;

  @Column({ type: "int" })
  idade: number;

  @Column({ type: "int" })
  categoria: number;

  @Column({ type: "int" })
  categoriaKata: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  peso: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  kyu: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  dan: string;

  @Column({ type: "int" })
  dojoId: number;

  @ManyToOne(() => Dojo, (dojo) => dojo.alunos)
  @JoinColumn({ name: "dojoId" })
  dojo: Dojo;

  @CreateDateColumn()
  criadoEm: Date;

  @UpdateDateColumn()
  atualizadoEm: Date;
}
