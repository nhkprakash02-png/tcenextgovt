// Ported from index.html lines ~286-323 (uid, priceLabel, batch feature helpers, timeAgo).

export function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function priceLabel(p) {
  return '₹' + p + ' / Month';
}

export function defaultBatchFeatures() {
  return ['Full access to all Mocks', 'PYQ Hub with multi-attempt analysis', 'Daily Quizzes', 'Detailed Analysis', 'Unlimited Re-attempts'];
}

// "What's Included" is entered by the admin as comma-separated text and stored on the batch;
// this normalizes it into a clean array for the homepage batch card's bulleted list, whether
// it's already an array or still a raw comma-separated string.
export function batchFeaturesList(b) {
  const raw = (b && b.features && (Array.isArray(b.features) ? b.features.length : String(b.features).trim()))
    ? b.features
    : defaultBatchFeatures();
  return Array.isArray(raw) ? raw : String(raw).split(',').map((f) => f.trim()).filter(Boolean);
}

export function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const hrs = diffMs / 3600000;
  if (hrs < 1) return Math.max(1, Math.round(diffMs / 60000)) + 'm ago';
  if (hrs < 24) return Math.round(hrs) + 'h ago';
  return Math.round(hrs / 24) + 'd ago';
}

export function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

// Mock Tests sub-category bifurcation (Mock Tests only — not used by PYQ, Quiz, or Study Materials).
export const SUBCATEGORIES = {
  science: ['Physics', 'Chemistry', 'Biology'],
  gk: ['History', 'Geography', 'Polity', 'Economy'],
  english: ['Grammar', 'Vocabulary'],
};

export const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'mocks', label: 'Mock Tests', icon: 'file-check-2' },
  { id: 'quiz', label: 'Quick Quiz', icon: 'zap' },
  { id: 'pyq', label: 'PYQ Hub', icon: 'archive' },
  { id: 'materials', label: 'Study Materials', icon: 'book-open' },
  { id: 'batches', label: 'Batches & Fees', icon: 'graduation-cap' },
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { id: 'notices', label: 'Notices & Contact', icon: 'bell' },
];

// These 4 accounts get lifetime full access to every mock test/material (no paywalls, no
// "unlock for enrolled" gating) and are hidden from the admin's student list, pending-approval
// queue, results dashboard, and all leaderboards/community-accuracy stats — they're mentor/admin
// accounts used for content review, not real students, so they shouldn't appear in student-facing
// or student-management views. Matched case-insensitively against the account's login email.
export const EXEMPT_ADMIN_EMAILS = [
  'pranabking79@gmail.com',
  'nhkprakash04@gmail.com',
  '7tanujoy@gmail.com',
  'tarafdermaharup@gmail.com',
];
export function isExemptEmail(email) {
  return !!email && EXEMPT_ADMIN_EMAILS.includes(String(email).trim().toLowerCase());
}
