import { Entity, Column, Index } from "typeorm";
import { BaseEntity } from "./base.entity";
import { koboColumn } from "../transformers";

/** Snapshot of what was bought. Product edits never change past orders. */
@Entity("order_items")
@Index("IDX_order_items_order_id", ["orderId"])
export class OrderItem extends BaseEntity {
  @Column({ name: "order_id", type: "uuid" })
  orderId!: string;

  @Column({ name: "product_id", type: "uuid" })
  productId!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ name: "image_url", type: "text", nullable: true })
  imageUrl?: string | null;

  @Column(koboColumn("unit_price_kobo"))
  unitPriceKobo!: number;

  @Column({ type: "int" })
  quantity!: number;
}
