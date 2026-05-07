/**
 * Seed script for the E2E test database.
 * Uses fixed UUIDs so CI always produces the same deterministic state.
 *
 * Run: node scripts/seed-test.mjs
 * Or via npm: npm run seed:test  (from apps/web)
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.test.local');
config({ path: envPath, override: true });

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_PASSWORD     = process.env.TEST_STUDENT_PASSWORD ?? 'TestPass123!';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.test.local');
  process.exit(1);
}

// ── Fixed IDs (deterministic across CI runs) ────────────────────────────────
const TEST_USER_ID  = '91146330-435c-435e-b636-48c3f0cd458f';
const TEST_EMAIL    = 'student_test@students.educompanion.app';
const SUBJECT_ID    = '00000000-0000-4000-a000-000000000001';
const CHAPTER_ID    = '00000000-0000-4000-a000-000000000002';
const QUIZ_ID       = '00000000-0000-4000-a000-000000000003';
const SUMMARY_ID    = '00000000-0000-4000-a000-000000000004';

// ── Sample content ────────────────────────────────────────────────────────────
const CHAPTER_CONTENT = `
Newton's Laws of Motion — Class 9 Science (CBSE)

FIRST LAW OF MOTION (Law of Inertia)
An object at rest remains at rest, and an object in motion continues to move in a straight line at constant speed, unless acted upon by an external unbalanced force.

Inertia is the property of an object by which it resists any change in its state of rest or motion. The mass of an object is a measure of its inertia — heavier objects have greater inertia.

Examples:
- A passenger lurches forward when a bus brakes suddenly (inertia of motion).
- Dust falls off a carpet when it is beaten (inertia of rest).

SECOND LAW OF MOTION
The rate of change of momentum of an object is proportional to the applied force and takes place in the direction of the force.

Formula: F = ma
Where F = force (Newton, N), m = mass (kg), a = acceleration (m/s²)

Momentum (p) = mass × velocity = mv
Force = rate of change of momentum = (mv − mu) / t = m(v − u)/t = ma

One Newton is defined as the force required to accelerate a 1 kg mass by 1 m/s².

THIRD LAW OF MOTION
For every action, there is an equal and opposite reaction. Forces always act in pairs.

Action and reaction forces:
- Act on different objects.
- Are equal in magnitude.
- Act in opposite directions.

Examples:
- A gun recoils when a bullet is fired.
- A rocket propels forward as gases are expelled backward.
- Swimming: you push water backward, water pushes you forward.

CONSERVATION OF MOMENTUM
The total momentum of a system remains constant when no external force acts on it.

m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂

This principle is applied in collisions, explosions, and rocket propulsion.
`.trim();

const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    type: 'mcq',
    question: 'Which of the following best describes Newton\'s First Law of Motion?',
    options: [
      'A) Force equals mass times acceleration',
      'B) Every action has an equal and opposite reaction',
      'C) An object at rest stays at rest unless acted upon by an external force',
      'D) Momentum is always conserved',
    ],
    correct_answer: 'C) An object at rest stays at rest unless acted upon by an external force',
    explanation: 'Newton\'s First Law, also called the Law of Inertia, states that objects resist changes in their state of motion.',
  },
  {
    id: 'q2',
    type: 'mcq',
    question: 'A force of 20 N acts on a 4 kg object. What is its acceleration?',
    options: [
      'A) 2 m/s²',
      'B) 5 m/s²',
      'C) 80 m/s²',
      'D) 16 m/s²',
    ],
    correct_answer: 'B) 5 m/s²',
    explanation: 'Using F = ma: a = F/m = 20/4 = 5 m/s².',
  },
  {
    id: 'q3',
    type: 'true_false',
    question: 'Action and reaction forces described in Newton\'s Third Law always act on the same object.',
    options: ['True', 'False'],
    correct_answer: 'False',
    explanation: 'Action and reaction forces act on different objects. For example, when you push a wall, you push the wall (action) and the wall pushes you back (reaction) — these are on different bodies.',
  },
  {
    id: 'q4',
    type: 'mcq',
    question: 'What is the SI unit of force?',
    options: [
      'A) Joule',
      'B) Pascal',
      'C) Newton',
      'D) Watt',
    ],
    correct_answer: 'C) Newton',
    explanation: 'The SI unit of force is the Newton (N), named after Sir Isaac Newton. 1 N = 1 kg·m/s².',
  },
  {
    id: 'q5',
    type: 'fill_blank',
    question: 'The total ___ of a closed system remains constant when no external force acts on it.',
    correct_answer: 'momentum',
    explanation: 'Conservation of Momentum states that the total momentum of an isolated system is constant. This follows directly from Newton\'s Third Law.',
  },
];

const FLASHCARDS = [
  {
    term: 'Inertia',
    definition: 'The tendency of an object to resist any change in its state of rest or uniform motion. Mass is a measure of inertia.',
  },
  {
    term: 'Newton\'s First Law',
    definition: 'An object remains at rest or in uniform motion in a straight line unless acted upon by an external unbalanced force.',
  },
  {
    term: 'Newton\'s Second Law',
    definition: 'F = ma. The net force on an object equals its mass times acceleration. Also stated as: force equals the rate of change of momentum.',
  },
  {
    term: 'Newton\'s Third Law',
    definition: 'For every action there is an equal and opposite reaction. Action and reaction forces act on different objects.',
  },
  {
    term: 'Momentum',
    definition: 'The product of an object\'s mass and velocity (p = mv). SI unit is kg·m/s. Total momentum of a closed system is conserved.',
  },
];

const SUMMARY_JSON = {
  quick_recap: 'Newton\'s three laws of motion describe how objects behave under forces. The First Law defines inertia; the Second Law gives the quantitative relationship F = ma; the Third Law states that forces come in action-reaction pairs. Together they explain everyday phenomena from sliding objects to rocket propulsion.',
  key_points: [
    'First Law (Inertia): Objects resist changes in their motion; an external force is needed to change velocity.',
    'Second Law: F = ma — force is directly proportional to acceleration and mass.',
    'Third Law: Every action has an equal, opposite reaction acting on a different object.',
    'Momentum (p = mv) is conserved in a closed system with no external forces.',
    '1 Newton = the force needed to accelerate 1 kg at 1 m/s².',
  ],
  key_concepts: [
    { term: 'Inertia', explanation: 'Resistance to change in state of motion; directly proportional to mass.' },
    { term: 'Force (F = ma)', explanation: 'Net force equals mass times acceleration; measured in Newtons (N).' },
    { term: 'Momentum', explanation: 'p = mv; rate of change of momentum equals applied force (Second Law).' },
    { term: 'Action-Reaction Pair', explanation: 'Equal and opposite forces that act on two different objects simultaneously.' },
    { term: 'Conservation of Momentum', explanation: 'Total momentum of an isolated system remains constant before and after a collision.' },
  ],
  exam_tips: [
    'Always state which law you are applying and why, especially in 3-mark and 5-mark questions.',
    'For F = ma numericals, write the formula first, substitute values with units, then simplify.',
    'Remember: action and reaction act on DIFFERENT objects — a common exam trap.',
    'Momentum questions often involve before-and-after collisions — write m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂.',
    'Inertia = mass conceptually; heavier objects are harder to start or stop.',
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function updateEnvFile(filePath, key, value) {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, `${key}=${value}\n`, 'utf8');
    return;
  }
  let content = readFileSync(filePath, 'utf8');
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  writeFileSync(filePath, content, 'utf8');
}

// ── Main ──────────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function applyMigrations() {
  // Apply idempotent DDL migrations that may not exist in the test DB yet.
  // Using service-role RPC or raw SQL is not available in the JS client, so we
  // replicate the schema changes via upserts/checks on the data plane instead.
  // The actual approach: attempt to SELECT the new column; if it fails the seed
  // continues anyway (the profile page degrades gracefully when columns are absent).
  //
  // To truly apply schema migrations to the test Supabase project, run the SQL
  // files in supabase/migrations/ against the test database via the Supabase CLI:
  //   npx supabase db push --db-url $TEST_DATABASE_URL
  //
  // For now this function is a no-op placeholder — the profile page handles
  // missing referral columns gracefully.
}

async function run() {
  console.log('Seeding test database…\n');

  await applyMigrations();

  // 1. Auth user
  process.stdout.write('1/7  Auth user… ');
  const { data: existingData } = await supabase.auth.admin.getUserById(TEST_USER_ID);
  if (!existingData.user) {
    const { error } = await supabase.auth.admin.createUser({
      user_id: TEST_USER_ID,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Auth user: ${error.message}`);
    console.log('created.');
  } else {
    await supabase.auth.admin.updateUserById(TEST_USER_ID, { password: TEST_PASSWORD });
    console.log('exists — password refreshed.');
  }

  // 2. Public profile
  process.stdout.write('2/7  Profile… ');
  const { error: profileErr } = await supabase.from('users').upsert({
    id: TEST_USER_ID,
    name: 'Test Student',
    email: TEST_EMAIL,
    grade: 9,
    board: 'CBSE',
    onboarding_done: true,
  }, { onConflict: 'id' });
  if (profileErr) throw new Error(`Profile: ${profileErr.message}`);
  console.log('done.');

  // 3. Gamification row
  process.stdout.write('3/7  Gamification… ');
  const { error: gamErr } = await supabase.from('user_gamification').upsert({
    user_id: TEST_USER_ID,
    total_xp: 0,
    level: 1,
    current_streak: 0,
    longest_streak: 0,
  }, { onConflict: 'user_id' });
  if (gamErr) throw new Error(`Gamification: ${gamErr.message}`);
  console.log('done.');

  // 4. Subject
  process.stdout.write('4/7  Subject… ');
  const { error: subjectErr } = await supabase.from('subjects').upsert({
    id: SUBJECT_ID,
    user_id: TEST_USER_ID,
    name: 'Science (Class 9)',
  }, { onConflict: 'id' });
  if (subjectErr) throw new Error(`Subject: ${subjectErr.message}`);
  console.log('done.');

  // 5. Chapter
  process.stdout.write('5/7  Chapter… ');
  const { error: chapterErr } = await supabase.from('chapters').upsert({
    id: CHAPTER_ID,
    subject_id: SUBJECT_ID,
    name: "Newton's Laws of Motion",
    upload_status: 'ready',
    complexity_score: 5.5,
    content_text: CHAPTER_CONTENT,
  }, { onConflict: 'id' });
  if (chapterErr) throw new Error(`Chapter: ${chapterErr.message}`);
  console.log('done.');

  // 6. Quiz
  process.stdout.write('6/7  Quiz… ');
  const { error: quizErr } = await supabase.from('quizzes').upsert({
    id: QUIZ_ID,
    chapter_id: CHAPTER_ID,
    questions_json: QUIZ_QUESTIONS,
  }, { onConflict: 'id' });
  if (quizErr) throw new Error(`Quiz: ${quizErr.message}`);
  console.log('done.');

  // 7. Flashcards (delete old ones for this chapter, then insert fresh)
  process.stdout.write('7/7  Flashcards… ');
  await supabase.from('flashcards').delete().eq('chapter_id', CHAPTER_ID);
  const { error: flashErr } = await supabase.from('flashcards').insert(
    FLASHCARDS.map(f => ({ chapter_id: CHAPTER_ID, term: f.term, definition: f.definition }))
  );
  if (flashErr) throw new Error(`Flashcards: ${flashErr.message}`);
  console.log('done.');

  // 8. Chapter summary (uses UNIQUE chapter_id constraint → upsert on that)
  process.stdout.write('     Summary… ');
  const { error: summaryErr } = await supabase.from('chapter_summaries').upsert({
    id: SUMMARY_ID,
    chapter_id: CHAPTER_ID,
    summary_json: SUMMARY_JSON,
  }, { onConflict: 'chapter_id' });
  if (summaryErr) throw new Error(`Summary: ${summaryErr.message}`);
  console.log('done.');

  // Write the chapter ID into .env.test.local so tests pick it up automatically
  updateEnvFile(envPath, 'TEST_SAMPLE_CHAPTER_ID', CHAPTER_ID);
  console.log(`\n✓ TEST_SAMPLE_CHAPTER_ID written to .env.test.local`);

  console.log('\nSeed complete!');
  console.log(`  Chapter ID : ${CHAPTER_ID}`);
  console.log(`  User ID    : ${TEST_USER_ID}`);
  console.log(`  Quiz ID    : ${QUIZ_ID}`);
}

run().catch(err => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
