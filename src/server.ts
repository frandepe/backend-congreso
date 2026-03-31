import { app } from "./app";
import { env } from "./config/env";

const server = app.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`);
});

export { server };
