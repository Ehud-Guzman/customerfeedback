export function ok(res, data = {}, meta = undefined) {
  return res.json({ ok: true, data, ...(meta ? { meta } : {}) });
}

export function fail(res, status, message, code = undefined, details = undefined) {
  return res.status(status).json({ ok: false, message, ...(code ? { code } : {}), ...(details ? { details } : {}) });
}
