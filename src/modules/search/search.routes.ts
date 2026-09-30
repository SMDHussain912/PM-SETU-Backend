import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { searchQuerySchema } from "./search.schema";
import { search } from "./search.controller";

/**
 * Search module — public routes (RoadMap.md §17).
 *
 * GET /api/v1/search — portal-wide search across all searchable entities
 */

const searchRouter = Router();

searchRouter.get("/", validate({ query: searchQuerySchema }), search);

export default searchRouter;
