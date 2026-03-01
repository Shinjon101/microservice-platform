import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "@/middlewares/error-handler";

export const createApp = (): express.Application => {
  const app = express();
  app.use(
    cors({
      origin: "*",
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(express.json());

  app.use((_req, res) => {
    res.status(404).json({ message: "Not Found" });
  });
  app.use(errorHandler);

  return app;
};
