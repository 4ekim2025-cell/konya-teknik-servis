import type { IncomingMessage, ServerResponse } from "node:http";
import { instagramFeedHandler } from "../server/instagram-feed.js";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return instagramFeedHandler(req, res);
}
