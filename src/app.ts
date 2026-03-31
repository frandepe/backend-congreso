import cors from "cors";
import express from "express";
import { corsOptions } from "./config/cors";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { requestLoggerMiddleware } from "./middlewares/request-logger.middleware";
import { apiRouter } from "./routes";

const app = express();

app.disable("x-powered-by");
app.use(cors(corsOptions));
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use("/api/v1", apiRouter);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export { app };
