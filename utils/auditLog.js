const AuditLog = require('../models/AuditLog');

/**
 * Records an entry in the audit trail. Deliberately fire-and-forget: a
 * logging failure (e.g. a transient Mongo hiccup) must never break the
 * request it's logging, so errors are swallowed after being logged to the
 * console.
 *
 * @param {object} opts
 * @param {import('express').Request} [opts.req] - used to pull ip/user-agent
 * @param {object|null} [opts.actor] - the acting user document (or null)
 * @param {string} opts.action - one of the AuditLog schema's action enums
 * @param {string} [opts.targetType]
 * @param {string} [opts.targetId]
 * @param {object} [opts.details]
 * @param {string} [opts.actorEmailOverride] - for failed logins where we
 *   know the attempted email but have no matching user document
 */
async function recordAudit({ req, actor, action, targetType = null, targetId = null, details = {}, actorEmailOverride = null }) {
  try {
    await AuditLog.create({
      actor: actor && actor._id !== undefined ? actor._id : (actor === 'admin' ? null : actor),
      actorEmail: (actor && actor.email) || actorEmailOverride || null,
      actorRole: (actor && actor.role) || null,
      action,
      targetType,
      targetId,
      details,
      ip: req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null) : null,
      userAgent: req ? req.headers['user-agent'] || null : null
    });
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

module.exports = { recordAudit };
