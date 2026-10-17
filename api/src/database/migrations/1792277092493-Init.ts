import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1792277092493 implements MigrationInterface {
  name = "Init1792277092493";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "email" character varying(255) NOT NULL, "password_hash" character varying(100) NOT NULL, "first_name" character varying(60) NOT NULL, "last_name" character varying(60) NOT NULL, "phone" character varying(20), "role" character varying(16) NOT NULL DEFAULT 'customer', "admin_role" character varying(16), "merchant_id" uuid, "status" character varying(16) NOT NULL DEFAULT 'active', "credit_limit_kobo" bigint NOT NULL DEFAULT '0', "sessions_revoked_at" TIMESTAMP WITH TIME ZONE, "last_login_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_users_role" ON "users" ("role") `);
    await queryRunner.query(`CREATE INDEX "IDX_users_merchant_id" ON "users" ("merchant_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email") `);
    await queryRunner.query(
      `CREATE TABLE "merchants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying(120) NOT NULL, "slug" character varying(140) NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'pending', "owner_user_id" uuid, "fee_bps" integer, "support_email" character varying(255), "settlement_bank_code" character varying(10), "settlement_account_number" character varying(20), "settlement_account_name" character varying(120), "paystack_recipient_code" character varying(64), CONSTRAINT "PK_4fd312ef25f8e05ad47bfe7ed25" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_merchants_status" ON "merchants" ("status") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_merchants_slug" ON "merchants" ("slug") `);
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "merchant_id" uuid NOT NULL, "name" character varying(120) NOT NULL, "description" text NOT NULL DEFAULT '', "price_kobo" bigint NOT NULL, "image_url" text, "category" character varying(24) NOT NULL DEFAULT 'other', "stock" integer NOT NULL DEFAULT '0', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_products_category" ON "products" ("category") `);
    await queryRunner.query(`CREATE INDEX "IDX_products_merchant_id" ON "products" ("merchant_id") `);
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reference" character varying(32) NOT NULL, "customer_id" uuid NOT NULL, "merchant_id" uuid NOT NULL, "plan_code" character varying(16) NOT NULL, "total_kobo" bigint NOT NULL, "fee_kobo" bigint NOT NULL, "installment_count" integer NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending_payment', "activated_at" TIMESTAMP WITH TIME ZONE, "completed_at" TIMESTAMP WITH TIME ZONE, "cancelled_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_orders_status" ON "orders" ("status") `);
    await queryRunner.query(`CREATE INDEX "IDX_orders_merchant_id" ON "orders" ("merchant_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_orders_customer_id" ON "orders" ("customer_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_orders_reference" ON "orders" ("reference") `);
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "order_id" uuid NOT NULL, "product_id" uuid NOT NULL, "name" character varying(120) NOT NULL, "image_url" text, "unit_price_kobo" bigint NOT NULL, "quantity" integer NOT NULL, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_order_items_order_id" ON "order_items" ("order_id") `);
    await queryRunner.query(
      `CREATE TABLE "installments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "order_id" uuid NOT NULL, "customer_id" uuid NOT NULL, "merchant_id" uuid NOT NULL, "sequence" integer NOT NULL, "amount_kobo" bigint NOT NULL, "late_fee_kobo" bigint NOT NULL DEFAULT '0', "due_date" date NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'pending', "paid_at" TIMESTAMP WITH TIME ZONE, "attempt_count" integer NOT NULL DEFAULT '0', "last_attempt_at" TIMESTAMP WITH TIME ZONE, "last_reminder_at" TIMESTAMP WITH TIME ZONE, "last_reminder_type" character varying(32), CONSTRAINT "PK_c74e44aa06bdebef2af0a93da1b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_installments_status_due_date" ON "installments" ("status", "due_date") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_installments_merchant_id" ON "installments" ("merchant_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_installments_customer_id" ON "installments" ("customer_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_installments_order_sequence" ON "installments" ("order_id", "sequence") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "reference" character varying(64) NOT NULL, "order_id" uuid NOT NULL, "installment_id" uuid, "customer_id" uuid NOT NULL, "merchant_id" uuid NOT NULL, "provider" character varying(16) NOT NULL, "channel" character varying(16) NOT NULL, "amount_kobo" bigint NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'pending', "payment_method_id" uuid, "provider_transaction_id" character varying(64), "authorization_url" text, "card_last4" character varying(4), "failure_reason" character varying(255), "paid_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_payments_status" ON "payments" ("status") `);
    await queryRunner.query(`CREATE INDEX "IDX_payments_customer_id" ON "payments" ("customer_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_payments_installment_id" ON "payments" ("installment_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_payments_order_id" ON "payments" ("order_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_payments_reference" ON "payments" ("reference") `);
    await queryRunner.query(
      `CREATE TABLE "payment_methods" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "customer_id" uuid NOT NULL, "provider" character varying(16) NOT NULL, "authorization_code" text NOT NULL, "signature" character varying(64) NOT NULL, "brand" character varying(24) NOT NULL, "last4" character varying(4) NOT NULL, "exp_month" character varying(2) NOT NULL, "exp_year" character varying(4) NOT NULL, "bank" character varying(80), "reusable" boolean NOT NULL DEFAULT true, "is_default" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_34f9b8c6dfb4ac3559f7e2820d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_payment_methods_customer_signature" ON "payment_methods" ("customer_id", "signature") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payouts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "merchant_id" uuid NOT NULL, "amount_kobo" bigint NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'requested', "reference" character varying(64) NOT NULL, "transfer_code" character varying(64), "failure_reason" character varying(500), "requested_by_user_id" uuid, "reviewed_by_user_id" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, "processed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_76855dc4f0a6c18c72eea302e87" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_payouts_status" ON "payouts" ("status") `);
    await queryRunner.query(`CREATE INDEX "IDX_payouts_merchant_id" ON "payouts" ("merchant_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_payouts_reference" ON "payouts" ("reference") `);
    await queryRunner.query(
      `CREATE TABLE "ledger_accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(120) NOT NULL, "name" character varying(160) NOT NULL, "type" character varying(16) NOT NULL, "owner_type" character varying(16) NOT NULL, "owner_id" uuid, "normal_balance" character varying(8) NOT NULL, "balance_kobo" bigint NOT NULL DEFAULT '0', CONSTRAINT "PK_62b34396dda564757cf123fff0e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ledger_accounts_owner" ON "ledger_accounts" ("owner_type", "owner_id") `,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ledger_accounts_code" ON "ledger_accounts" ("code") `);
    await queryRunner.query(
      `CREATE TABLE "ledger_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "kind" character varying(32) NOT NULL, "reference" character varying(120) NOT NULL, "description" character varying(255) NOT NULL, "metadata" jsonb, CONSTRAINT "PK_633d103c9e415d615aacf9b1929" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ledger_transactions_created_at" ON "ledger_transactions" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ledger_transactions_kind_reference" ON "ledger_transactions" ("kind", "reference") `,
    );
    await queryRunner.query(
      `CREATE TABLE "ledger_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "transaction_id" uuid NOT NULL, "account_id" uuid NOT NULL, "direction" character varying(8) NOT NULL, "amount_kobo" bigint NOT NULL, CONSTRAINT "CHK_ledger_entries_amount_positive" CHECK ("amount_kobo" > 0), CONSTRAINT "PK_6efcb84411d3f08b08450ae75d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_ledger_entries_account_id" ON "ledger_entries" ("account_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_ledger_entries_transaction_id" ON "ledger_entries" ("transaction_id") `);
    await queryRunner.query(
      `CREATE TABLE "webhook_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "provider" character varying(16) NOT NULL, "event" character varying(64) NOT NULL, "reference" character varying(120), "dedupe_key" character varying(200) NOT NULL, "status" character varying(16) NOT NULL DEFAULT 'received', "attempts" integer NOT NULL DEFAULT '0', "error" text, "payload" jsonb NOT NULL, "processed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_4cba37e6a0acb5e1fc49c34ebfd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_webhook_events_status" ON "webhook_events" ("status") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_webhook_events_dedupe_key" ON "webhook_events" ("dedupe_key") `);
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "type" character varying(32) NOT NULL, "title" character varying(120) NOT NULL, "body" character varying(500) NOT NULL, "data" jsonb, "read_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_user_created" ON "notifications" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "device_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "platform" character varying(16) NOT NULL, "token" text NOT NULL, "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_84700be257607cfb1f9dc2e52c3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_device_tokens_user" ON "device_tokens" ("user_id") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_device_tokens_token" ON "device_tokens" ("token") `);
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying, "action" character varying NOT NULL, "resource_type" character varying NOT NULL, "resource_id" character varying, "old_values" jsonb, "new_values" jsonb, "ip_address" character varying, "user_agent" character varying, "metadata" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at") `);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action") `);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_user_id" ON "audit_logs" ("user_id") `);
    await queryRunner.query(
      `CREATE TABLE "platform_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "key" character varying(100) NOT NULL, "value" jsonb, "updated_by_admin_user_id" uuid, CONSTRAINT "PK_2934aeb70ec285196dcab4a2e96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_platform_settings_key" ON "platform_settings" ("key") `);

    // Double-entry guard: at COMMIT, every ledger transaction touched must have debits = credits.
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION ledger_assert_balanced() RETURNS trigger AS $$
            DECLARE imbalance bigint;
            BEGIN
                SELECT COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_kobo ELSE -amount_kobo END), 0)
                  INTO imbalance
                  FROM ledger_entries
                 WHERE transaction_id = NEW.transaction_id;
                IF imbalance <> 0 THEN
                    RAISE EXCEPTION 'Ledger transaction % is unbalanced by % kobo', NEW.transaction_id, imbalance
                        USING ERRCODE = 'check_violation';
                END IF;
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql`);
    await queryRunner.query(`
            CREATE CONSTRAINT TRIGGER "TRG_ledger_entries_balanced"
            AFTER INSERT OR UPDATE ON "ledger_entries"
            DEFERRABLE INITIALLY DEFERRED
            FOR EACH ROW EXECUTE FUNCTION ledger_assert_balanced()`);

    // Entries are append-only: a correction is a new reversing transaction.
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION ledger_entries_immutable() RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'ledger_entries are append-only' USING ERRCODE = 'restrict_violation';
            END;
            $$ LANGUAGE plpgsql`);
    await queryRunner.query(`
            CREATE TRIGGER "TRG_ledger_entries_immutable"
            BEFORE UPDATE OR DELETE ON "ledger_entries"
            FOR EACH ROW EXECUTE FUNCTION ledger_entries_immutable()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "TRG_ledger_entries_immutable" ON "ledger_entries"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS "TRG_ledger_entries_balanced" ON "ledger_entries"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS ledger_entries_immutable()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS ledger_assert_balanced()`);
    await queryRunner.query(`DROP INDEX "public"."IDX_platform_settings_key"`);
    await queryRunner.query(`DROP TABLE "platform_settings"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_action"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_audit_logs_created_at"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_device_tokens_token"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_device_tokens_user"`);
    await queryRunner.query(`DROP TABLE "device_tokens"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_created"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_webhook_events_dedupe_key"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_webhook_events_status"`);
    await queryRunner.query(`DROP TABLE "webhook_events"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_entries_transaction_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_entries_account_id"`);
    await queryRunner.query(`DROP TABLE "ledger_entries"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_transactions_kind_reference"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_transactions_created_at"`);
    await queryRunner.query(`DROP TABLE "ledger_transactions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_accounts_code"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ledger_accounts_owner"`);
    await queryRunner.query(`DROP TABLE "ledger_accounts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payouts_reference"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payouts_merchant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payouts_status"`);
    await queryRunner.query(`DROP TABLE "payouts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_methods_customer_signature"`);
    await queryRunner.query(`DROP TABLE "payment_methods"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_reference"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_order_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_installment_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_customer_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_payments_status"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_installments_order_sequence"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_installments_customer_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_installments_merchant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_installments_status_due_date"`);
    await queryRunner.query(`DROP TABLE "installments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_order_items_order_id"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_reference"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_customer_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_merchant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_status"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_products_merchant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_products_category"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_merchants_slug"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_merchants_status"`);
    await queryRunner.query(`DROP TABLE "merchants"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_merchant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_role"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
