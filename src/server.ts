import { app } from "./app";
import { env } from "./config/env";
import { logEmailTransportConfigStatus } from "./services/email.service";

const server = app.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`);
  logEmailTransportConfigStatus();
});

export { server };
