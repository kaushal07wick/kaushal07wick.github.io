// Cloudflare Worker entry.
//
// A Worker-with-static-assets does NOT run the Pages `functions/` convention,
// so this script wires those handlers to their routes and lets the static
// assets binding serve everything else. Same handlers, no duplication.

import * as shot from "./functions/api/shot.js";
import * as session from "./functions/api/session.js";
import * as login from "./functions/api/login.js";
import * as images from "./functions/api/images.js";
import * as publish from "./functions/api/publish.js";
import * as upload from "./functions/api/upload.js";

const ROUTES = {
  "/api/shot": shot,
  "/api/session": session,
  "/api/login": login,
  "/api/images": images,
  "/api/publish": publish,
  "/api/upload": upload,
};

export default {
  async fetch(request, env, ctx) {
    const mod = ROUTES[new URL(request.url).pathname];
    if (mod) {
      const handler =
        request.method === "POST" ? mod.onRequestPost :
        request.method === "GET"  ? mod.onRequestGet  : null;
      if (!handler) return new Response("method not allowed", { status: 405 });
      return handler({ request, env, ctx });   // ctx carries waitUntil for shot's edge cache
    }
    return env.ASSETS.fetch(request);          // static files (html/css/js/images/posts)
  },
};
