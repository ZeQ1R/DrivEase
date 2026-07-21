export async function getStudentPhase(db, studentId) {
  const reg = await db.query(
    `SELECT school_id, instructor_id, required_theory_hours, required_hours
     FROM registrations WHERE student_id = $1 AND status = 'approved' LIMIT 1`,
    [studentId]
  );
  if (reg.rows.length === 0) return null;
  const r = reg.rows[0];

  const theory = await db.query(
    `SELECT COALESCE(SUM(s.duration_hours), 0) AS hours
     FROM lesson_bookings b
     JOIN lesson_slots s ON s.id = b.slot_id
     WHERE b.student_id = $1 AND s.slot_type = 'theory' AND (s.slot_date + s.slot_time) < NOW()`,
    [studentId]
  );

  const practical = await db.query(
    `SELECT COALESCE(SUM(s.duration_hours), 0) AS hours
     FROM lesson_bookings b
     JOIN lesson_slots s ON s.id = b.slot_id
     WHERE b.student_id = $1 AND b.attended = true AND s.slot_type = 'practical'`,
    [studentId]
  );

  const theoryCompleted = Number(theory.rows[0].hours);
  const theoryRequired = Number(r.required_theory_hours ?? 21);
  const theoryDone = theoryCompleted >= theoryRequired;

  const practicalCompleted = Number(practical.rows[0].hours);
  const practicalRequired = Number(r.required_hours ?? 40.5);
  const practicalDone = practicalCompleted >= practicalRequired;

  // phase stays 'practical' even once practical is done, so the frontend's
  // readyForTest (phase === 'practical' && hours complete) still works.
  let phase;
  if (!theoryDone) phase = "theory";
  else if (!r.instructor_id) phase = "awaiting-instructor";
  else phase = "practical";

  return {
    schoolId: r.school_id,
    instructorId: r.instructor_id,
    theoryCompleted,
    theoryRequired,
    theoryDone,
    practicalCompleted,
    practicalRequired,
    practicalDone,
    phase,
  };
}
