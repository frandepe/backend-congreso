import { Router } from "express";
import { adminAuthRouter } from "./admin-auth.routes";
import { adminSubmissionsRouter } from "./admin-submissions.routes";
import { healthRouter } from "./health.routes";
import { submissionsRouter } from "./submissions.routes";

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/admin/auth", adminAuthRouter);
apiRouter.use("/admin/submissions", adminSubmissionsRouter);
apiRouter.use(submissionsRouter);

export { apiRouter };
