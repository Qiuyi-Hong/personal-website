import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);

// "::" accepts IPv6, which Railway's private network uses, and IPv4 on dual-stack hosts.
createApp().listen(port, "::", () => {
  console.log(`backend listening on port ${port}`);
});
