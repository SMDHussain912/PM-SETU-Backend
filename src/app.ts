import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import routes from "./routes";
import { apiLimiter } from "./middleware/rateLimit.middleware";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { logger } from "./utils/logger";

const app = express();

// In production the app runs behind a reverse proxy (nginx). Trusting the
// first proxy hop keeps client IPs correct for rate limiting.
if (env.isProduction) {
    app.set("trust proxy", 1);
}

// 1. Security headers
app.use(helmet());

// 2. CORS
app.use(
    cors({
        origin: env.corsOrigins === "*" ? true : env.corsOrigins,
        credentials: env.corsOrigins !== "*",
    }),
);

// 3. Rate limiting for the whole API surface
app.use("/api/v1", apiLimiter);

// 4. Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// 5. Request logging (development only)
if (!env.isProduction) {
    app.use((req, _res, next) => {
        logger.debug(`${req.method} ${req.originalUrl}`);
        next();
    });
}

// 6. Routes (mounted under /api/v1)
app.use("/api/v1", routes);

// 7. 404 for unmatched routes
app.use(notFoundHandler);

// 8. Central error handler (must be registered last)
app.use(errorHandler);

export default app;
