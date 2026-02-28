const bcrypt = require("bcrypt");
const crypto = require("crypto");
const pool = require("../config/db");

const TOKEN_SALT_ROUNDS = 10;

function createDeviceToken() {
  return crypto.randomBytes(24).toString("hex");
}

async function createDevice(userId, payload) {
  const apiToken = createDeviceToken();
  const apiTokenHash = await bcrypt.hash(apiToken, TOKEN_SALT_ROUNDS);

  const q = await pool.query(
    `INSERT INTO devices (user_id, device_code, device_name, api_token_hash, install_location, firmware_version)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, device_code, device_name, 'offline' AS status, install_location, firmware_version, last_seen_at, created_at, updated_at`,
    [
      userId,
      payload.device_code.trim(),
      payload.device_name.trim(),
      apiTokenHash,
      payload.install_location || null,
      payload.firmware_version || null,
    ]
  );

  return {
    ...q.rows[0],
    api_token: apiToken,
  };
}

// A device is considered online if it reported within the last 2 minutes.
const ONLINE_THRESHOLD_SEC = 120;

async function listDevices(userId) {
  const q = await pool.query(
    `SELECT id, user_id, device_code, device_name,
            CASE
              WHEN last_seen_at IS NOT NULL
                   AND last_seen_at > NOW() - INTERVAL '${ONLINE_THRESHOLD_SEC} seconds'
              THEN 'online'
              ELSE 'offline'
            END AS status,
            install_location, firmware_version, last_seen_at, created_at, updated_at
     FROM devices
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return q.rows;
}

async function getDeviceById(userId, deviceId) {
  const q = await pool.query(
    `SELECT id, user_id, device_code, device_name,
            CASE
              WHEN last_seen_at IS NOT NULL
                   AND last_seen_at > NOW() - INTERVAL '${ONLINE_THRESHOLD_SEC} seconds'
              THEN 'online'
              ELSE 'offline'
            END AS status,
            install_location, firmware_version, last_seen_at, created_at, updated_at
     FROM devices
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [deviceId, userId]
  );

  if (q.rowCount === 0) {
    throw new Error("DEVICE_NOT_FOUND");
  }

  return q.rows[0];
}

async function updateDeviceById(userId, deviceId, payload) {
  await getDeviceById(userId, deviceId);

  const assignments = [];
  const values = [];

  if (payload.device_name !== undefined) {
    values.push(payload.device_name.trim());
    assignments.push(`device_name = $${values.length}`);
  }
  if (payload.install_location !== undefined) {
    values.push(payload.install_location);
    assignments.push(`install_location = $${values.length}`);
  }
  if (payload.firmware_version !== undefined) {
    values.push(payload.firmware_version);
    assignments.push(`firmware_version = $${values.length}`);
  }

  if (assignments.length === 0) {
    return getDeviceById(userId, deviceId);
  }

  values.push(deviceId, userId);

  const q = await pool.query(
    `UPDATE devices
     SET ${assignments.join(", ")}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND user_id = $${values.length}
     RETURNING id, user_id, device_code, device_name,
               CASE
                 WHEN last_seen_at IS NOT NULL
                      AND last_seen_at > NOW() - INTERVAL '${ONLINE_THRESHOLD_SEC} seconds'
                 THEN 'online'
                 ELSE 'offline'
               END AS status,
               install_location, firmware_version, last_seen_at, created_at, updated_at`,
    values
  );

  return q.rows[0];
}

async function deleteDeviceById(userId, deviceId) {
  const q = await pool.query(
    `DELETE FROM devices
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [deviceId, userId]
  );

  if (q.rowCount === 0) {
    throw new Error("DEVICE_NOT_FOUND");
  }

  return { id: q.rows[0].id };
}

module.exports = {
  createDevice,
  listDevices,
  getDeviceById,
  updateDeviceById,
  deleteDeviceById,
};
