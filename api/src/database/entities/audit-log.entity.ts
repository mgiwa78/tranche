import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity("audit_logs")
@Index("IDX_audit_logs_user_id", ["userId"])
@Index("IDX_audit_logs_action", ["action"])
@Index("IDX_audit_logs_created_at", ["createdAt"])
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", nullable: true, type: "varchar" })
  userId?: string;

  @Column({ type: "varchar" })
  action!: string;

  @Column({ name: "resource_type", type: "varchar" })
  resourceType!: string;

  @Column({ name: "resource_id", nullable: true, type: "varchar" })
  resourceId?: string;

  @Column({ name: "old_values", nullable: true, type: "jsonb" })
  oldValues?: Record<string, unknown>;

  @Column({ name: "new_values", nullable: true, type: "jsonb" })
  newValues?: Record<string, unknown>;

  @Column({ name: "ip_address", nullable: true, type: "varchar" })
  ipAddress?: string;

  @Column({ name: "user_agent", nullable: true, type: "varchar" })
  userAgent?: string;

  @Column({ nullable: true, type: "jsonb" })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
