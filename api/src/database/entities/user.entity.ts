import { Entity, Column, Index } from "typeorm";
import { AccountStatus, AdminRole, UserRole } from "@tranche/shared";
import { SoftDeleteBaseEntity } from "./soft-delete-base.entity";
import { koboColumn } from "../transformers";

@Entity("users")
@Index("IDX_users_email", ["email"], { unique: true })
@Index("IDX_users_merchant_id", ["merchantId"])
@Index("IDX_users_role", ["role"])
export class User extends SoftDeleteBaseEntity {
  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ name: "password_hash", type: "varchar", length: 100 })
  passwordHash!: string;

  @Column({ name: "first_name", type: "varchar", length: 60 })
  firstName!: string;

  @Column({ name: "last_name", type: "varchar", length: 60 })
  lastName!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone?: string | null;

  @Column({ type: "varchar", length: 16, default: UserRole.CUSTOMER })
  role!: UserRole;

  @Column({ name: "admin_role", type: "varchar", length: 16, nullable: true })
  adminRole?: AdminRole | null;

  @Column({ name: "merchant_id", type: "uuid", nullable: true })
  merchantId?: string | null;

  @Column({ type: "varchar", length: 16, default: AccountStatus.ACTIVE })
  status!: AccountStatus;

  @Column(koboColumn("credit_limit_kobo", { default: 0 }))
  creditLimitKobo!: number;

  @Column({ name: "sessions_revoked_at", type: "timestamptz", nullable: true })
  sessionsRevokedAt?: Date | null;

  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt?: Date | null;
}
