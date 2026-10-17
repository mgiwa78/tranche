import { Entity, Column, Index } from "typeorm";
import { ProductCategory } from "@tranche/shared";
import { SoftDeleteBaseEntity } from "./soft-delete-base.entity";
import { koboColumn } from "../transformers";

@Entity("products")
@Index("IDX_products_merchant_id", ["merchantId"])
@Index("IDX_products_category", ["category"])
export class Product extends SoftDeleteBaseEntity {
  @Column({ name: "merchant_id", type: "uuid" })
  merchantId!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column(koboColumn("price_kobo"))
  priceKobo!: number;

  @Column({ name: "image_url", type: "text", nullable: true })
  imageUrl?: string | null;

  @Column({ type: "varchar", length: 24, default: ProductCategory.OTHER })
  category!: ProductCategory;

  @Column({ type: "int", default: 0 })
  stock!: number;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;
}
