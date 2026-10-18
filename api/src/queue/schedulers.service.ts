import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Config, runsWorkers } from "@/config";
import { Logger } from "@/common/logger";
import { JOBS, QUEUES } from "./queue.constants";

/**
 * Registers the repeatable jobs. BullMQ job schedulers are de-duplicated in Redis, so N api
 * instances still run each tick once.
 */
@Injectable()
export class SchedulersService implements OnApplicationBootstrap {
  private logger = new Logger({ level: Config.logging.level, service: "schedulers" });

  constructor(
    @InjectQueue(QUEUES.REMINDERS) private readonly reminders: Queue,
    @InjectQueue(QUEUES.CHARGES) private readonly charges: Queue,
    @InjectQueue(QUEUES.MAINTENANCE) private readonly maintenance: Queue,
  ) {}

  async onApplicationBootstrap() {
    if (!runsWorkers() || Config.queue.inline || Config.nodeEnv === "test") return;
    const tz = Config.schedules.timezone;
    await this.reminders.upsertJobScheduler(
      "daily-reminders",
      { pattern: Config.schedules.remindersCron, tz },
      { name: JOBS.SEND_REMINDERS },
    );
    await this.charges.upsertJobScheduler(
      "hourly-charge-scan",
      { pattern: Config.schedules.chargesCron, tz },
      { name: JOBS.SCAN_DUE },
    );
    await this.maintenance.upsertJobScheduler(
      "nightly-delinquency",
      { pattern: Config.schedules.overdueCron, tz },
      { name: JOBS.DELINQUENCY_SWEEP },
    );
    this.logger.info("Job schedulers registered", {
      reminders: Config.schedules.remindersCron,
      charges: Config.schedules.chargesCron,
      delinquency: Config.schedules.overdueCron,
      tz,
    });
  }
}
