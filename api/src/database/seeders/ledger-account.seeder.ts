import { DataSource } from "typeorm";
import { LedgerAccount } from "@/database/entities";
import { PLATFORM_ACCOUNTS } from "@/core/ledger/chart-of-accounts";

/** The platform's own accounts (clearing, fee revenue, late fee revenue). Merchant and customer accounts open on first posting. */
export class LedgerAccountSeeder {
  public async run(dataSource: DataSource): Promise<void> {
    await dataSource
      .createQueryBuilder()
      .insert()
      .into(LedgerAccount)
      .values(Object.values(PLATFORM_ACCOUNTS).map((spec) => ({ ...spec, balanceKobo: 0 })))
      .orIgnore()
      .execute();
  }
}
