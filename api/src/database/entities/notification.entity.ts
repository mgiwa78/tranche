import { Entity, Column, Index } from "typeorm";
import { NotificationType } from "@tranche/shared";
import { BaseEntity } from "./base.entity";

/** In-app inbox. Every push we send is also written here so nothing is lost if push is off. */
@Entity("notifications")
@Index("IDX_notifications_user_created", ["userId", "createdAt"])
export class Notification extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 32 })
  type!: NotificationType;

  @Column({ type: "varchar", length: 120 })
  title!: string;

  @Column({ type: "varchar", length: 500 })
  body!: string;

  @Column({ type: "jsonb", nullable: true })
  data?: Record<string, string> | null;

  @Column({ name: "read_at", type: "timestamptz", nullable: true })
  readAt?: Date | null;
}
