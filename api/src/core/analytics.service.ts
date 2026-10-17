import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { SeriesPoint } from "@tranche/shared";
import { Config } from "@/config";

/**
 * Daily GMV (orders financed), cash collected and order count, zero-filled with
 * generate_series so charts have no gaps. Scoped to one merchant, or platform-wide.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async series(days: number, merchantId?: string): Promise<SeriesPoint[]> {
    const tz = Config.schedules.timezone;
    const rows: { day: string; gmv: string; orders: string; collected: string }[] = await this.dataSource.query(
      `
      WITH days AS (
        SELECT generate_series((now() AT TIME ZONE $1)::date - ($2::int - 1), (now() AT TIME ZONE $1)::date, interval '1 day')::date AS day
      ),
      financed AS (
        SELECT (o.activated_at AT TIME ZONE $1)::date AS day, SUM(o.total_kobo) AS gmv, COUNT(*) AS orders
          FROM orders o
         WHERE o.activated_at IS NOT NULL
           AND o.activated_at >= now() - ($2::int || ' days')::interval - interval '1 day'
           AND ($3::uuid IS NULL OR o.merchant_id = $3::uuid)
         GROUP BY 1
      ),
      collected AS (
        SELECT (p.paid_at AT TIME ZONE $1)::date AS day, SUM(p.amount_kobo) AS collected
          FROM payments p
         WHERE p.status = 'success'
           AND p.paid_at >= now() - ($2::int || ' days')::interval - interval '1 day'
           AND ($3::uuid IS NULL OR p.merchant_id = $3::uuid)
         GROUP BY 1
      )
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
             COALESCE(f.gmv, 0) AS gmv, COALESCE(f.orders, 0) AS orders, COALESCE(c.collected, 0) AS collected
        FROM days d
        LEFT JOIN financed f ON f.day = d.day
        LEFT JOIN collected c ON c.day = d.day
       ORDER BY d.day ASC`,
      [tz, days, merchantId ?? null],
    );
    return rows.map((r) => ({
      date: r.day,
      gmvKobo: Number(r.gmv),
      collectedKobo: Number(r.collected),
      orders: Number(r.orders),
    }));
  }

  async orderStatusCounts(merchantId?: string): Promise<Record<string, number>> {
    const rows: { status: string; count: string }[] = await this.dataSource.query(
      `SELECT status, COUNT(*) AS count FROM orders WHERE ($1::uuid IS NULL OR merchant_id = $1::uuid) GROUP BY status`,
      [merchantId ?? null],
    );
    return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
  }
}
