import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./base.entity";

@Entity("platform_settings")
@Index("IDX_platform_settings_key", ["key"], { unique: true })
export class PlatformSetting extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  key!: string;

  @Column({ type: "jsonb", nullable: true })
  value?: unknown;

  @Column({ name: "updated_by_admin_user_id", type: "uuid", nullable: true })
  updatedByAdminUserId?: string | null;
}
