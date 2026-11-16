import { db } from "./db.js";
import { makeHandlers } from "./handlers.js";

export const handlers = makeHandlers(db);
