// Ported verbatim (data + logic) from index.html seedDB(), lines ~324-454.
import { uid } from './utils';
import { SUBCATEGORIES } from './utils';

export function seedDB() {
  const subjects = ['math', 'english', 'reasoning', 'gk', 'science', 'full'];
  const subjectLabel = { math: 'Math', english: 'English', reasoning: 'Reasoning', gk: 'GK', science: 'Science', full: 'Full Mock' };

  function sampleQ(subject, n) {
    const banks = {
      math: [
        { en: 'What is 15% of 200?', bn: '200 এর 15% কত?', opts: ['20', '25', '30', '35'], correct: 2, exp: '15% of 200 = 30.' },
        { en: 'Find the next number: 2, 6, 12, 20, ?', bn: 'পরবর্তী সংখ্যাটি নির্ণয় করুন: 2, 6, 12, 20, ?', opts: ['28', '30', '26', '32'], correct: 0, exp: '+8 pattern: 20+8=28.' },
        { en: 'A train 100m long crosses a pole in 10s. Find its speed (m/s).', bn: 'একটি 100 মিটার লম্বা ট্রেন একটি খুঁটি অতিক্রম করে 10 সেকেন্ডে। গতি নির্ণয় করুন (মি/সে)।', opts: ['8', '10', '12', '15'], correct: 1, exp: 'Speed = distance/time = 100/10 = 10 m/s.' },
        { en: 'Simplify: 7 + 3 × 2', bn: 'সরল করুন: 7 + 3 × 2', opts: ['20', '13', '17', '10'], correct: 1, exp: 'BODMAS: 3×2=6, 7+6=13.' },
        { en: 'If cost price is ₹80 and selling price is ₹100, find profit %.', bn: 'ক্রয়মূল্য ৮০ টাকা এবং বিক্রয়মূল্য ১০০ টাকা হলে লাভের শতাংশ কত?', opts: ['20%', '25%', '15%', '30%'], correct: 1, exp: 'Profit = 20, %=20/80×100=25%.' },
      ],
      english: [
        { en: "Choose the correct synonym of 'Happy'.", bn: '', opts: ['Sad', 'Joyful', 'Angry', 'Tired'], correct: 1, exp: 'Joyful means happy.' },
        { en: 'Fill in the blank: She ___ to school every day.', bn: '', opts: ['go', 'goes', 'going', 'gone'], correct: 1, exp: 'Subject-verb agreement: She goes.' },
        { en: 'Choose the correctly spelled word.', bn: '', opts: ['Recieve', 'Receive', 'Receeve', 'Receve'], correct: 1, exp: "'Receive' - i before e except after c." },
        { en: "Antonym of 'Increase' is:", bn: '', opts: ['Decrease', 'Grow', 'Expand', 'Rise'], correct: 0, exp: 'Decrease is opposite of increase.' },
        { en: "Identify the noun in: 'The dog ran fast.'", bn: '', opts: ['ran', 'fast', 'dog', 'the'], correct: 2, exp: "'Dog' is the noun." },
      ],
      reasoning: [
        { en: 'Find the odd one out: Apple, Mango, Potato, Banana', bn: 'অসঙ্গতিটি খুঁজুন: Apple, Mango, Potato, Banana', opts: ['Apple', 'Mango', 'Potato', 'Banana'], correct: 2, exp: 'Potato is a vegetable, others are fruits.' },
        { en: "If A=1, B=2, C=3... what is the value of 'CAB'?", bn: '', opts: ['321', '213', '312', '6'], correct: 2, exp: 'C=3,A=1,B=2 -> 312.' },
        { en: 'Complete the series: 3, 9, 27, 81, ?', bn: 'ধারাটি সম্পূর্ণ করুন: 3, 9, 27, 81, ?', opts: ['162', '243', '324', '729'], correct: 1, exp: 'Each term ×3, 81×3=243.' },
        { en: "Pointing to a man, a woman says 'He is the son of my mother's mother'. How is he related to her?", bn: '', opts: ['Brother', 'Uncle', 'Cousin', 'Father'], correct: 0, exp: 'He is her brother (both grandchildren of same grandmother).' },
        { en: 'Which number will replace the question mark? 5,10,20,40,?', bn: '', opts: ['60', '70', '80', '90'], correct: 2, exp: 'Each term doubles: 40×2=80.' },
      ],
      gk: [
        { en: "Who is known as the 'Father of the Nation' in India?", bn: "ভারতের 'জাতির পিতা' কাকে বলা হয়?", opts: ['Nehru', 'Gandhi', 'Bose', 'Patel'], correct: 1, exp: 'Mahatma Gandhi.' },
        { en: 'What is the capital of West Bengal?', bn: 'পশ্চিমবঙ্গের রাজধানী কী?', opts: ['Howrah', 'Kolkata', 'Darjeeling', 'Asansol'], correct: 1, exp: 'Kolkata is the capital of West Bengal.' },
        { en: 'The Indian Constitution was adopted on:', bn: 'ভারতের সংবিধান কবে গৃহীত হয়?', opts: ['15 Aug 1947', '26 Jan 1950', '26 Nov 1949', '2 Oct 1950'], correct: 2, exp: 'Adopted on 26 Nov 1949, enforced 26 Jan 1950.' },
        { en: 'Which is the longest river in India?', bn: 'ভারতের দীর্ঘতম নদী কোনটি?', opts: ['Yamuna', 'Ganga', 'Godavari', 'Brahmaputra'], correct: 1, exp: 'River Ganga is the longest in India.' },
        { en: 'West Bengal Police was established under which Act?', bn: '', opts: ['Police Act 1861', 'Police Act 1900', 'Police Act 1947', 'Police Act 1975'], correct: 0, exp: 'Indian Police Act, 1861.' },
        { en: 'Current Affairs: Which state hosted the 2026 National Games? (Demo Q)', bn: '', opts: ['Uttarakhand', 'West Bengal', 'Kerala', 'Gujarat'], correct: 0, exp: 'Demo current affairs sample — replace via Admin GK Uploader.' },
      ],
      science: [
        { en: 'What is the SI unit of force?', bn: 'বলের SI একক কী?', opts: ['Joule', 'Newton', 'Watt', 'Pascal'], correct: 1, exp: 'The SI unit of force is the Newton (N).' },
        { en: 'Which gas do plants absorb from the atmosphere for photosynthesis?', bn: 'সালোকসংশ্লেষণের জন্য উদ্ভিদ বায়ুমণ্ডল থেকে কোন গ্যাস গ্রহণ করে?', opts: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correct: 2, exp: 'Plants absorb Carbon Dioxide (CO2) for photosynthesis.' },
        { en: 'The human heart has how many chambers?', bn: 'মানুষের হৃদয়ে কতগুলি প্রকোষ্ঠ থাকে?', opts: ['2', '3', '4', '5'], correct: 2, exp: 'The human heart has 4 chambers: 2 atria and 2 ventricles.' },
        { en: 'Which part of the atom carries a negative charge?', bn: 'পরমাণুর কোন অংশে ঋণাত্মক চার্জ থাকে?', opts: ['Proton', 'Neutron', 'Electron', 'Nucleus'], correct: 2, exp: 'Electrons carry a negative charge.' },
        { en: 'pH value of pure water at room temperature is:', bn: '', opts: ['5', '7', '9', '11'], correct: 1, exp: 'Pure water is neutral with a pH of 7.' },
      ],
    };
    const src = subject === 'full' ? [].concat(banks.math.slice(0, 2), banks.english.slice(0, 2), banks.reasoning.slice(0, 1)) : banks[subject];
    const out = [];
    for (let i = 0; i < n; i++) {
      const q = src[i % src.length];
      out.push({
        id: uid('q'), textEn: q.en, textBn: q.bn || '',
        options: q.opts.map((o, idx) => ({ key: String.fromCharCode(65 + idx), textEn: o, textBn: '' })),
        correct: String.fromCharCode(65 + q.correct), explanation: q.exp, solutionImg: '',
      });
    }
    return out;
  }

  const mockTests = {};
  subjects.forEach((sub) => {
    mockTests[sub] = [1, 2, 3].map((n) => ({
      id: uid('mt'), subject: sub, title: `${subjectLabel[sub]} Mock Test ${n}`, isDemo: n === 1, adminUnlocked: false, examCategory: 'All Exams',
      durationMin: sub === 'full' ? 60 : 20, marksCorrect: 2, marksWrong: 0.5,
      subCategory: SUBCATEGORIES[sub] ? SUBCATEGORIES[sub][(n - 1) % SUBCATEGORIES[sub].length] : undefined,
      questions: sampleQ(sub, sub === 'full' ? 10 : 8),
    }));
  });

  const quizPool = sampleQ('gk', 12).map((q) => ({ ...q, subject: 'gk' }));

  if (mockTests.math[1]) mockTests.math[1].examCategory = 'Railway (RRB)';
  if (mockTests.gk[1]) mockTests.gk[1].examCategory = 'Railway (RRB)';
  if (mockTests.reasoning[1]) mockTests.reasoning[1].examCategory = 'Railway (RRB)';

  const pyqSets = [
    { id: uid('pyq'), title: 'WBP Constable PYQ 2024 - Shift 1', examCategory: 'WBP Constable', year: '2024', durationMin: 30, marksCorrect: 1, marksWrong: 0.25, questions: sampleQ('gk', 6) },
    { id: uid('pyq'), title: 'SSC GD Constable PYQ 2023 - Shift 2', examCategory: 'SSC GD', year: '2023', durationMin: 30, marksCorrect: 1, marksWrong: 0.25, questions: sampleQ('reasoning', 6) },
    { id: uid('pyq'), title: 'KP SI PYQ 2022', examCategory: 'KP SI', year: '2022', durationMin: 30, marksCorrect: 1, marksWrong: 0.25, questions: sampleQ('math', 6) },
    { id: uid('pyq'), title: 'Railway (RRB) NTPC PYQ 2024', examCategory: 'Railway (RRB)', year: '2024', durationMin: 30, marksCorrect: 1, marksWrong: 0.25, questions: sampleQ('math', 6) },
    { id: uid('pyq'), title: 'Railway (RRB) Group D PYQ 2023', examCategory: 'Railway (RRB)', year: '2023', durationMin: 30, marksCorrect: 1, marksWrong: 0.25, questions: sampleQ('gk', 6) },
  ];

  return {
    examCategories: ['WBP Constable', 'KP SI', 'SSC GD', 'Railway (RRB)', 'WBPSC Clerkship'],
    banners: [
      { title: 'WBP Constable & SI Batch', subtitle: 'Complete syllabus coverage with daily mock tests', tag: 'Admissions Open', grad: 'from-amber-600 via-yellow-500 to-orange-600' },
      { title: 'KP SI Special Batch', subtitle: 'Kolkata Police SI - Expert faculty & test series', tag: 'Limited Seats', grad: 'from-yellow-600 via-amber-500 to-yellow-400' },
      { title: 'SSC GD Constable Batch', subtitle: 'Crack SSC GD with focused practice & PYQs', tag: 'New Batch', grad: 'from-orange-600 via-amber-500 to-yellow-500' },
      { title: 'Railway (RRB) NTPC / Group D / ALP Batch', subtitle: 'Complete Railway exam preparation with free PYQs & daily quizzes', tag: 'Now Live', grad: 'from-amber-500 via-orange-500 to-yellow-600' },
    ],
    ticker: '🚨 Now Coaching for WBP • KP (Kolkata Police) • SSC GD • Railway (RRB / NTPC / Group D / ALP) • WBPSC — All-in-one CBT Mock Test Platform!  🎉 New batches starting soon — Enroll now @ ₹300 only!  📢 100% Free PYQs, Daily Quizzes & Study Materials for everyone.  📝 Weekly test series every Sunday.',
    students: [
      { id: uid('st'), name: 'Rahul Das', phone: '9800011122', email: 'rahul@example.com', address: 'Siliguri, WB', joinDate: '2026-06-12', paymentStatus: 'Approved', batch: 'WBP Special' },
      { id: uid('st'), name: 'Priya Sarkar', phone: '9800033344', email: 'priya@example.com', address: 'Jalpaiguri, WB', joinDate: '2026-07-02', paymentStatus: 'Pending', batch: 'SSC GD' },
      { id: uid('st'), name: 'Amit Roy', phone: '9800055566', email: 'amit@example.com', address: 'Cooch Behar, WB', joinDate: '2026-07-15', paymentStatus: 'Blocked', batch: 'KP SI' },
    ],
    mockTests, quizPool, pyqSets,
    quizDurations: { 5: 3, 10: 7, 15: 10, 20: 12 },
    submissions: [],
    materials: {
      math: [{ id: uid('mat'), title: 'Math Formula Booklet (Demo)', url: '', isFreeDemo: true, views: 0 }],
      english: [{ id: uid('mat'), title: 'English Grammar Notes (Demo)', url: '', isFreeDemo: true, views: 0 }],
      reasoning: [{ id: uid('mat'), title: 'Reasoning Shortcuts (Demo)', url: '', isFreeDemo: true, views: 0 }],
      gk: [{ id: uid('mat'), title: 'GK Capsule 2026 (Demo)', url: '', isFreeDemo: true, views: 0 }],
      science: [{ id: uid('mat'), title: 'Science Notes (Demo)', url: '', isFreeDemo: true, views: 0 }],
      currentAffairs: [{ id: uid('mat'), title: 'Current Affairs — August 2026 (Demo)', url: '', isFreeDemo: true, views: 0 }],
    },
    notices: [
      { id: uid('nt'), title: 'WBP Constable Recruitment 2026 Notification Out', date: '2026-08-20', body: 'West Bengal Police has released the recruitment notification. Check eligibility and apply before the deadline.' },
      { id: uid('nt'), title: 'Sunday Full Mock Test Schedule', date: '2026-08-24', body: 'Full length mock test every Sunday 10 AM. Enrolled students will get notification via WhatsApp.' },
      { id: uid('nt'), title: 'SSC GD Constable Exam Date Announced', date: '2026-08-18', body: 'SSC has announced the tentative CBT exam dates for GD Constable recruitment.' },
    ],
    inquiries: [],
    batches: [
      { id: uid('bt'), name: 'Target WBP / SSC Special Batch', price: 300, active: true, examCategory: 'WBP Constable',
        features: ['All premium mock tests unlocked', 'Full study material library', 'Live doubt-clearing WhatsApp group', 'Rank & performance analytics'],
        timetable: [['Mon / Wed / Fri', 'Math & Reasoning'], ['Tue / Thu', 'English & GK'], ['Sunday', 'Full Mock Test']] },
      { id: uid('bt'), name: 'KP SI Special Batch', price: 300, active: true, examCategory: 'KP SI',
        features: ['SI-specific syllabus coverage', 'Weekly test series', 'Expert mentor support'],
        timetable: [['Mon / Thu', 'Reasoning & Math'], ['Wed / Sat', 'GK & English']] },
      { id: uid('bt'), name: 'Railway (RRB) NTPC / Group D / ALP Special Batch', price: 300, active: true, examCategory: 'Railway (RRB)',
        features: ['Complete RRB NTPC, Group D & ALP syllabus', 'Railway-specific mock tests', 'Free PYQs & daily GK quizzes included', 'Rank & performance analytics'],
        timetable: [['Mon / Wed / Fri', 'Math & GK'], ['Tue / Thu', 'Reasoning & General Science'], ['Sunday', 'Full Mock Test']] },
    ],
    mentors: [
      { id: uid('mn'), name: 'Tanujoy Mallick', subject: 'General Studies', phone: '919749587349', photo: 'tanujoy.png' },
      { id: uid('mn'), name: 'Prakash Sarkar', subject: 'Mathematics', phone: '917384644030', photo: 'prakash.png' },
      { id: uid('mn'), name: 'Maharup Tarafder', subject: 'General Science, Static GK & Current Affairs', phone: '918327416813', photo: 'maharup.png' },
      { id: uid('mn'), name: 'Pranab Sadhukhan', subject: 'Reasoning & English', phone: '917407879095', photo: 'pranab.png' },
    ],
    urgentNotices: [],
  };
}

export function normalizeDB(db) {
  Object.keys(db.mockTests || {}).forEach((sub) => {
    (db.mockTests[sub] || []).forEach((t) => { if (!t.examCategory) t.examCategory = 'All Exams'; if (t.adminUnlocked === undefined) t.adminUnlocked = false; });
  });
  Object.keys(db.materials || {}).forEach((cat) => {
    (db.materials[cat] || []).forEach((m) => { if (m.isFreeDemo === undefined) m.isFreeDemo = false; });
  });
  (db.students || []).forEach((s) => { if (s.pendingReview === undefined) s.pendingReview = false; });
  if (!db.urgentNotices) db.urgentNotices = []; // backfill for existing live databases
  if (db.mockTests && (!db.mockTests.science || !db.mockTests.science.length)) {
    db.mockTests.science = seedDB().mockTests.science;
  }
  if (db.materials && (!db.materials.science || !db.materials.science.length)) {
    db.materials.science = seedDB().materials.science;
  }
  if (!db.quizDurations) db.quizDurations = { 5: 3, 10: 7, 15: 10, 20: 12 };
  (db.batches || []).forEach((b) => {
    if (!b.examCategory) b.examCategory = 'All Exams';
    if (b.price === undefined || b.price === null || Number.isNaN(Number(b.price))) b.price = 300;
    if (b.originalPrice !== undefined && b.originalPrice !== null && !(Number(b.originalPrice) > Number(b.price))) delete b.originalPrice;
    if (!b.features || !b.features.length || (b.features.length === 1 && b.features[0] === 'Full access to batch resources')) b.features = ['Full access to all Mocks', 'PYQ Hub with multi-attempt analysis', 'Daily Quizzes', 'Detailed Analysis', 'Unlimited Re-attempts'];
  });
  if (!db.examCategories || !db.examCategories.includes('Railway (RRB)')) {
    db.examCategories = db.examCategories || [];
    db.examCategories = db.examCategories.filter((c) => c !== 'Railway');
    if (!db.examCategories.includes('Railway (RRB)')) db.examCategories.push('Railway (RRB)');
  }
  (db.mentors || []).forEach((m) => { if (m.name === 'Tanujoy Mallick') { m.subject = 'General Studies'; delete m.nameBn; } });
  const mentorPhotoByName = { 'Tanujoy Mallick': 'tanujoy.png', 'Prakash Sarkar': 'prakash.png', 'Maharup Tarafder': 'maharup.png', 'Pranab Sadhukhan': 'pranab.png' };
  (db.mentors || []).forEach((m) => { if (!m.photo && mentorPhotoByName[m.name]) m.photo = mentorPhotoByName[m.name]; });
  return db;
}

// Structurally-valid but EMPTY database, used as the app's placeholder state before the real
// Firestore load finishes — replaces using seedDB() as that placeholder, which is what caused
// the "dummy Math Mock Test 1/2/3 flashes for a second on refresh" bug: the seed data used to
// render immediately on first paint since it WAS the initial state, before real data arrived
// and replaced it. An empty shape here means there's simply no dummy content to flash; pages
// should check `dbLoading` (see AppContext) to show a skeleton/spinner instead during this gap.
export function emptyDB() {
  return {
    examCategories: [], banners: [], ticker: '', students: [],
    mockTests: { math: [], english: [], reasoning: [], gk: [], science: [], full: [] },
    quizPool: [], pyqSets: [], submissions: [],
    materials: { math: [], english: [], reasoning: [], gk: [], science: [], currentAffairs: [] },
    notices: [], inquiries: [], batches: [], mentors: [], quizDurations: {}, urgentNotices: [],
  };
}
