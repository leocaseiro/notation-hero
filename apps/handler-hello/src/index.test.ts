import { test } from "node:test";
import assert from "node:assert/strict";

import { handler } from "./index.ts";

test("handler returns a 200 hello JSON response", async () => {
  const res = await handler();

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["content-type"], "application/json");

  const body = JSON.parse(res.body) as { message: string };
  assert.match(body.message, /hello/i);
});
