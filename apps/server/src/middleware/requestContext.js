import crypto from "node:crypto";

export function createRequestContext(appLogger) {
  return function requestContext(req, res, next) {
    const startedAt = process.hrtime.bigint();
    req.requestId = crypto.randomUUID();
    res.set("x-request-id", req.requestId);
    res.on("finish", () => {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      appLogger.debug("Request completed", {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        elapsedMs: Number(elapsedMs.toFixed(1))
      });
    });
    next();
  };
}
