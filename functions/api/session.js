// GET /api/session  — is the current visitor logged in? (drives the login screen)
import { requireAuth, json } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  return json({ authed: await requireAuth(request, env), configured: !!env.STUDIO_PASSWORD });
}
