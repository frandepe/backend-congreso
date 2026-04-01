import { Router } from "express";
import { adminAuthRouter } from "./admin-auth.routes";
import { adminCommercialSubmissionsRouter } from "./admin-commercial-submissions.routes";
import { adminSubmissionsRouter } from "./admin-submissions.routes";
import { commercialSubmissionsRouter } from "./commercial-submissions.routes";
import { healthRouter } from "./health.routes";
import { submissionsRouter } from "./submissions.routes";

const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/admin/auth", adminAuthRouter);
apiRouter.use("/admin/submissions", adminSubmissionsRouter);
apiRouter.use("/admin/commercial-submissions", adminCommercialSubmissionsRouter);
apiRouter.use(commercialSubmissionsRouter);
apiRouter.use(submissionsRouter);

export { apiRouter };
