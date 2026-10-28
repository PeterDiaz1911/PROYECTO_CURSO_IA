import { createAssistantHandler } from "./handler.ts";

// Auth is verified inside the handler via the Supabase Auth server.
// This supports projects with asymmetric signing keys without trusting client JWT claims.
Deno.serve(createAssistantHandler({ env: (name) => Deno.env.get(name), fetcher: fetch }));
