const { createTelemetrySchema, createTelemetryBatchSchema } = require("../validations/telemetry.validation");
const {
  createTelemetry,
  createTelemetryBatch,
  getLatestTelemetry,
  getDailyTelemetry,
  getUsageHistory,
  getExportData,
} = require("../services/telemetry.service");
const { ok, fail } = require("../utils/response");

async function postTelemetry(req, res) {
  try {
    const parsed = createTelemetrySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, parsed.error.issues[0]?.message || "Invalid payload", 422, "VALIDATION_ERROR");
    }

    const result = await createTelemetry(parsed.data);
    return ok(res, result, "Telemetry ingested", 201);
  } catch (err) {
    if (err.message === "DEVICE_NOT_FOUND") {
      return fail(res, "Device not found", 404, "DEVICE_NOT_FOUND");
    }
    if (err.code === "23505") {
      return fail(res, "Duplicate measurement timestamp for this device", 409, "DUPLICATE_TELEMETRY");
    }
    console.error("postTelemetry error:", err);
    return fail(res, "Internal server error", 500, "INTERNAL_ERROR");
  }
}

async function postTelemetryBatch(req, res) {
  try {
    const parsed = createTelemetryBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, parsed.error.issues[0]?.message || "Invalid payload", 422, "VALIDATION_ERROR");
    }

    const result = await createTelemetryBatch(parsed.data);
    return ok(res, result, "Telemetry batch ingested", 201);
  } catch (err) {
    if (err.message === "DEVICE_NOT_FOUND") {
      return fail(res, "Device not found", 404, "DEVICE_NOT_FOUND");
    }
    console.error("postTelemetryBatch error:", err);
    return fail(res, "Internal server error", 500, "INTERNAL_ERROR");
  }
}

async function latestTelemetry(req, res) {
  try {
    const { device_code } = req.query;
    if (!device_code) return fail(res, "device_code is required", 422, "VALIDATION_ERROR");

    const data = await getLatestTelemetry(req.user.id, device_code);
    if (!data) return fail(res, "No telemetry found", 404, "NOT_FOUND");

    return ok(res, data, "Latest telemetry");
  } catch (err) {
    if (err.message === "DEVICE_NOT_FOUND") {
      return fail(res, "Device not found", 404, "DEVICE_NOT_FOUND");
    }
    console.error("latestTelemetry error:", err);
    return fail(res, "Internal server error", 500, "INTERNAL_ERROR");
  }
}

async function dailyTelemetry(req, res) {
  try {
    const { device_code, date } = req.query;
    if (!device_code || !date) {
      return fail(res, "device_code and date are required", 422, "VALIDATION_ERROR");
    }

    const data = await getDailyTelemetry(req.user.id, device_code, date);
    return ok(res, { device_code, date, items: data }, "Daily telemetry");
  } catch (err) {
    if (err.message === "DEVICE_NOT_FOUND") {
      return fail(res, "Device not found", 404, "DEVICE_NOT_FOUND");
    }
    console.error("dailyTelemetry error:", err);
    return fail(res, "Internal server error", 500, "INTERNAL_ERROR");
  }
}

async function usageHistory(req, res) {
  try {
    const { device_code, from, to } = req.query;
    if (!device_code || !from || !to) {
      return fail(res, "device_code, from, and to are required", 422, "VALIDATION_ERROR");
    }

    const data = await getUsageHistory(req.user.id, device_code, from, to);
    return ok(res, { device_code, from, to, items: data }, "Usage history");
  } catch (err) {
    if (err.message === "DEVICE_NOT_FOUND") {
      return fail(res, "Device not found", 404, "DEVICE_NOT_FOUND");
    }
    console.error("usageHistory error:", err);
    return fail(res, "Internal server error", 500, "INTERNAL_ERROR");
  }
}

async function exportCsv(req, res) {
  try {
    const { device_code, from, to } = req.query;
    if (!device_code || !from || !to) {
      return fail(res, "device_code, from, and to are required", 422, "VALIDATION_ERROR");
    }

    const rows = await getExportData(req.user.id, device_code, from, to);

    const header = "measured_at,flow_rate_lpm,volume_delta_l,cumulative_volume_l,pulse_count,battery_voltage,rssi_dbm";
    const csvLines = rows.map((r) =>
      [
        r.measured_at ? new Date(r.measured_at).toISOString() : "",
        r.flow_rate_lpm ?? "",
        r.volume_delta_l ?? "",
        r.cumulative_volume_l ?? "",
        r.pulse_count ?? "",
        r.battery_voltage ?? "",
        r.rssi_dbm ?? "",
      ].join(",")
    );

    const csv = [header, ...csvLines].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${device_code}_${from}_${to}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    if (err.message === "DEVICE_NOT_FOUND") {
      return fail(res, "Device not found", 404, "DEVICE_NOT_FOUND");
    }
    console.error("exportCsv error:", err);
    return fail(res, "Internal server error", 500, "INTERNAL_ERROR");
  }
}

module.exports = {
  postTelemetry,
  postTelemetryBatch,
  latestTelemetry,
  dailyTelemetry,
  usageHistory,
  exportCsv,
};
