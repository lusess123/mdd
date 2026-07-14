import { createApp } from "./app";

const app = createApp();

export type AppType = typeof app;
export { createApp };
export default app;
