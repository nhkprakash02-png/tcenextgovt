// POST /api/email/send-enrollment-confirmation
// Body: { studentId, batchName }
//
// Triggered from StudentsManager.jsx's existing grantAccess action. Idempotent via
// `enrollmentEmailSent`, checked/set authoritatively with the Admin SDK — so clicking "Grant"
// again on an already-approved student won't re-send the email.
import { NextResponse } from 'next/server';
import { readAdminKeyValue, writeAdminKeyValue } from '../../../../lib/firebaseAdmin';
import { sendEmail } from '../../../../lib/resend';
import { enrollmentConfirmationEmail } from '../../../../lib/emailTemplates';

export async function POST(request) {
  try {
    const { studentId, batchName } = await request.json();
    if (!studentId || !batchName) return NextResponse.json({ error: 'studentId and batchName are required.' }, { status: 400 });

    const students = await readAdminKeyValue('students', []);
    const idx = students.findIndex((s) => s.id === studentId);
    if (idx === -1) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });

    const student = students[idx];
    if (student.enrollmentEmailSent) {
      return NextResponse.json({ ok: true, alreadySent: true });
    }
    if (!student.email) {
      return NextResponse.json({ error: 'This student has no email on file.' }, { status: 400 });
    }

    const { subject, html } = enrollmentConfirmationEmail({ name: student.name || 'there', batchName });
    await sendEmail({ to: student.email, subject, html });

    const nextStudents = [...students];
    nextStudents[idx] = { ...student, enrollmentEmailSent: true };
    await writeAdminKeyValue('students', nextStudents);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('send-enrollment-confirmation failed:', err);
    return NextResponse.json({ error: 'Could not send enrollment confirmation email.' }, { status: 500 });
  }
}
