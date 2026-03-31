import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

const validateBody =
  <T>(schema: ZodType<T>) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const parsedBody = await schema.parseAsync(req.body);
    req.body = parsedBody;
    next();
  };

const validateParams =
  <T>(schema: ZodType<T>) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const parsedParams = await schema.parseAsync(req.params);
    req.params = parsedParams as Request["params"];
    next();
  };

const validateQuery =
  <T>(schema: ZodType<T>) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const parsedQuery = await schema.parseAsync(req.query);
    Object.assign(req.query, parsedQuery);
    next();
  };

export { validateBody, validateParams, validateQuery };
