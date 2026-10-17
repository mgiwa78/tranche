import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { DevicePlatform } from "@tranche/shared";

@Entity("device_tokens")
@Index("IDX_device_tokens_token", ["token"], { unique: true })
@Index("IDX_device_tokens_user", ["userId"])
export class DeviceToken extends BaseEntity {
  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 16 })
  platform!: DevicePlatform;

  @Column({ type: "text" })
  token!: string;

  @Column({ name: "last_seen_at", type: "timestamptz" })
  lastSeenAt!: Date;
}
