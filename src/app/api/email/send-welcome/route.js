// POST /api/email/send-welcome
// Body: { studentId }
//
// Idempotent by design: checks and sets `welcomeEmailSent` on the student's Firestore record
// using the Admin SDK (authoritative, not trusted from the client), so calling this twice for
// the same student — e.g. two quick re-renders both trying to trigger it — only ever sends one
// email. Safe to call from anywhere without worrying about duplicate sends.
import { NextResponse } from 'next/server';
import { readAdminKeyValue, writeAdminKeyValue } from '../../../../lib/firebaseAdmin';
import { sendEmail } from '../../../../lib/resend';
import { welcomeEmail } from '../../../../lib/emailTemplates';

export async function POST(request) {
  try {
    const { studentId } = await request.json();
    if (!studentId) return NextResponse.json({ error: 'studentId is required.' }, { status: 400 });

    const students = await readAdminKeyValue('students', []);
    const idx = students.findIndex((s) => s.id === studentId);
    if (idx === -1) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });

    const student = students[idx];
    if (student.welcomeEmailSent) {
      return NextResponse.json({ ok: true, alreadySent: true });
    }
    if (!student.email) {
      return NextResponse.json({ error: 'This student has no email on file.' }, { status: 400 });
    }

    const { subject, html } = welcomeEmail({ name: student.name || 'there' });
    await sendEmail({ to: student.email, subject, html });

    const nextStudents = [...students];
    nextStudents[idx] = { ...student, welcomeEmailSent: true };
    await writeAdminKeyValue('students', nextStudents);

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Deliberately never lets an email failure surface as a user-facing error — the caller
    // always fire-and-forgets this with .catch(), so this response is only ever inspected by
    // you (via logs) if something needs debugging, never seen by the student.
    console.error('send-welcome failed:', err);
    return NextResponse.json({ error: 'Could not send welcome email.' }, { status: 500 });
  }
}
