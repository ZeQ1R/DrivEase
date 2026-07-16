// Works out where an approved student is in their journey:
//   'theory'             -> still completing required theory hours (books theory slots)
//   'awaiting-instructor'-> theory done, school hasn't assigned an instructor yet
//   'practical'          -> instructor assigned, books that instructor's practical slots
//
// `db` can be the pool or a checked-out client (so it can run inside a transaction).
// Returns null when the student has no approved registration.
export async function getStudentPhase(db, studentId) {
  const reg = await db.query(
    `SELECT school_id, instructor_id, required_theory_hours
     FROM registrations WHERE student_id = $1 AND status = 'approved' LIMIT 1`,
    [studentId]
  );
  if (reg.rows.length === 0) return null;
  const r = reg.rows[0];

  // theory classes count automatically once their scheduled time has passed
  const theory = await db.query(
    `SELECT COALESCE(SUM(s.duration_hours), 0) AS hours
     FROM lesson_bookings b
     JOIN lesson_slots s ON s.id = b.slot_id
     WHERE b.student_id = $1 AND s.slot_type = 'theory' AND (s.slot_date + s.slot_time) < NOW()`,
    [studentId]
  );

  const theoryCompleted = Number(theory.rows[0].hours);
  const theoryRequired = Number(r.required_theory_hours ?? 20);
  const theoryDone = theoryCompleted >= theoryRequired;

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
    phase,
  };
}
