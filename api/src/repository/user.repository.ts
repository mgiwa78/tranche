import { DataSource } from "typeorm";
import { User } from "@/database/entities";
import { RedisClient } from "@/common/redis/client";
import { BaseRepository } from "./base.repository";
import { RequestFilter, buildListFilter } from "@/common/helpers/list-filter";

export class UserRepository extends BaseRepository<User> {
  // Auth reads users on every request; a stale cached status would let a suspended user through.
  protected cacheEnabled = false;

  constructor(dataSource: DataSource, redis?: RedisClient) {
    super(User, dataSource, redis);
  }

  protected getAlias(): string {
    return "user";
  }

  protected getSearchFields(): string[] {
    return ["email", "firstName", "lastName", "phone"];
  }

  findByEmail(email: string) {
    return this.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  listPaginated(filter: RequestFilter, force: Record<string, unknown>) {
    return this.findPaginated(
      buildListFilter<User>(filter, { filters: ["status"], sorts: ["createdAt", "email"], force }),
    );
  }
}
