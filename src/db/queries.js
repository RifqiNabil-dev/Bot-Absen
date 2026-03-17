const dbManager = require("./connection");

/**
 * Boss functions
 */
async function addBoss(name, points) {
  const db = dbManager.get();
  try {
    const result = await db.run(
      "INSERT INTO bosses (name, points) VALUES (?, ?)",
      [name, points],
    );
    return { success: true, id: result.lastID };
  } catch (error) {
    if (error.message && error.message.includes("UNIQUE constraint failed")) {
      return { success: false, error: "Boss already exists" };
    }
    throw error;
  }
}

async function getBosses() {
  const db = dbManager.get();
  return db.all("SELECT * FROM bosses ORDER BY name ASC");
}

async function deleteBoss(name) {
  const db = dbManager.get();
  try {
    const result = await db.run("DELETE FROM bosses WHERE name = ?", [name]);
    return { success: true, changes: result.changes };
  } catch (error) {
    throw error;
  }
}

async function getBossByName(name) {
  const db = dbManager.get();
  return db.get("SELECT * FROM bosses WHERE name = ?", [name]);
}

/**
 * Absence functions
 */
async function createAbsence(
  messageId,
  bossName,
  bossPoints,
  createDate,
  appearDate,
) {
  const db = dbManager.get();
  try {
    const result = await db.run(
      `INSERT INTO absences (message_id, boss_name, boss_points, create_date, appear_date, is_active) 
             VALUES (?, ?, ?, ?, ?, 1)`,
      [messageId, bossName, bossPoints, createDate, appearDate],
    );
    return { success: true, id: result.lastID };
  } catch (error) {
    throw error;
  }
}

async function getAbsence(messageId) {
  const db = dbManager.get();
  return db.get("SELECT * FROM absences WHERE message_id = ?", [messageId]);
}

async function getActiveAbsences() {
  const db = dbManager.get();
  return db.all("SELECT * FROM absences WHERE is_active = 1");
}

async function closeAbsence(messageId) {
  const db = dbManager.get();
  await db.run("UPDATE absences SET is_active = 0 WHERE message_id = ?", [
    messageId,
  ]);
  return { success: true };
}

async function deleteAbsence(appearDate) {
  const db = dbManager.get();

  // Get all absences that match the date first
  const absences = await db.all(
    "SELECT message_id FROM absences WHERE appear_date LIKE ?",
    [`${appearDate}%`],
  );

  if (absences.length === 0) return { success: false, deleted: 0 };

  // Start a transaction since we delete from multiple tables
  await db.run("BEGIN TRANSACTION");
  try {
    for (const absence of absences) {
      await db.run("DELETE FROM attendance WHERE message_id = ?", [
        absence.message_id,
      ]);
      await db.run("DELETE FROM absences WHERE message_id = ?", [
        absence.message_id,
      ]);
    }
    await db.run("COMMIT");
    return { success: true, deleted: absences.length };
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }
}

async function deleteAbsenceByMessageId(messageId) {
  const db = dbManager.get();
  await db.run("BEGIN TRANSACTION");
  try {
    await db.run("DELETE FROM attendance WHERE message_id = ?", [messageId]);
    await db.run("DELETE FROM absences WHERE message_id = ?", [messageId]);
    await db.run("COMMIT");
    return { success: true };
  } catch (error) {
    await db.run("ROLLBACK");
    throw error;
  }
}

/**
 * Attendance functions
 */
async function addAttendance(
  messageId,
  userId,
  profileName,
  attendanceDate,
  phase = null,
) {
  const db = dbManager.get();

  // Check if user already took attendance for this specific phase
  const existing = await db.get(
    "SELECT id FROM attendance WHERE message_id = ? AND user_id = ? AND (phase = ? OR (? IS NULL AND phase IS NULL))",
    [messageId, userId, phase, phase],
  );
  if (existing) {
    return { success: false, error: "User already recorded" };
  }

  const result = await db.run(
    "INSERT INTO attendance (message_id, user_id, profile_name, attendance_date, phase) VALUES (?, ?, ?, ?, ?)",
    [messageId, userId, profileName, attendanceDate, phase],
  );
  return { success: true, id: result.lastID };
}

async function removeAttendance(messageId, userId, phase = null) {
  const db = dbManager.get();
  let query = "DELETE FROM attendance WHERE message_id = ? AND user_id = ?";
  let params = [messageId, userId];

  if (phase !== null) {
    query += " AND phase = ?";
    params.push(phase);
  }

  const result = await db.run(query, params);
  return { success: true, changes: result.changes };
}

async function getAttendance(messageId) {
  const db = dbManager.get();
  return db.all(
    "SELECT * FROM attendance WHERE message_id = ? ORDER BY attendance_date ASC",
    [messageId],
  );
}

module.exports = {
  addBoss,
  getBosses,
  getBossByName,
  createAbsence,
  getAbsence,
  getActiveAbsences,
  closeAbsence,
  deleteAbsence,
  deleteAbsenceByMessageId,
  addAttendance,
  removeAttendance,
  getAttendance,
  deleteBoss,
};
