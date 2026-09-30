import * as homeRepository from "./home.repository";
import type { HomeKpis } from "./home.types";

/**
 * Home module — service layer.
 *
 * Owns the module's business rules and delegates all data access to the
 * repository. Controllers never talk to the database directly, and no SQL
 * lives above the repository layer.
 */
export async function getHomeKpis(): Promise<HomeKpis> {
    return homeRepository.getHomeKpis();
}
