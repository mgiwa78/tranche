import { Entity, Column, Index } from "typeorm";
import { OrderStatus, PlanCode } from "@tranche/shared";
import { BaseEntity } from "./base.entity";
import { koboColumn } from "../transformers";

@Entity("orders")
@Index("IDX_orders_reference", ["reference"], { unique: true })
@Index("IDX_orders_customer_id", ["customerId"])
@Index("IDX_orders_merchant_id", ["merchantId"])
@Index("IDX_orders_status", ["status"])
export class Order extends BaseEntity {
  /** Human friendly, e.g. `TR-8K2Q4M`. */
  @Column({ type: "varchar", length: 32 })
  reference!: string;

  @Column({ name: "customer_id", type: "uuid" })
  customerId!: string;

  @Column({ name: "merchant_id", type: "uuid" })
  merchantId!: string;

  @Column({ name: "plan_code", type: "varchar", length: 16 })
  planCode!: PlanCode;

  @Column(koboColumn("total_kobo"))
  totalKobo!: number;

  /** Merchant discount rate Tranche keeps, fixed at checkout. */
  @Column(koboColumn("fee_kobo"))
  feeKobo!: number;

  @Column({ name: "installment_count", type: "int" })
  installmentCount!: number;

  @Column({ type: "varchar", length: 20, default: OrderStatus.PENDING_PAYMENT })
  status!: OrderStatus;

  @Column({ name: "activated_at", type: "timestamptz", nullable: true })
  activatedAt?: Date | null;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt?: Date | null;

  @Column({ name: "cancelled_at", type: "timestamptz", nullable: true })
  cancelledAt?: Date | null;
}
