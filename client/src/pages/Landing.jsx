import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarCheck,
  ChartColumn,
  ClipboardCheck,
  FileSearch,
  FileUp,
  MessageSquareQuote,
  Quote,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import HeroIllustration from '../components/HeroIllustration.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const FEATURES = [
  { icon: FileSearch, title: 'Ask your own PDFs', text: 'Upload lecture notes, papers or textbooks and ask questions in plain language. Answers come from your material, not from the open internet.' },
  { icon: Quote, title: 'Citations you can check', text: 'Every answer lists the file and page it relied on, with the exact passage. If your material does not cover the question, Rembrio says so.' },
  { icon: ClipboardCheck, title: 'Quizzes from your material', text: 'Generate multiple-choice quizzes grounded in your documents, with explanations and the page each question came from.' },
  { icon: CalendarCheck, title: 'Study plans', text: 'Turn a goal and a deadline into a task list based on what you uploaded. Tick tasks off as you go.' },
  { icon: ChartColumn, title: 'Honest progress tracking', text: 'Scores and activity are recorded from what you actually do. A topic is only flagged as weak once there is enough evidence.' },
];

const STEPS = [
  { icon: FileUp, title: 'Upload', text: 'Add a PDF. Rembrio extracts the text page by page and splits it into passages.' },
  { icon: FileSearch, title: 'Retrieve', text: 'Your question is matched by meaning against your passages, and only the most relevant ones are selected.' },
  { icon: MessageSquareQuote, title: 'Answer', text: 'Gemini writes an answer from those passages alone, and each source is shown beside it.' },
];

const BENEFITS = [
  'Spend less time searching through long PDFs.',
  'Check any claim against the original page in one click.',
  'Practise with questions written from your own notes.',
  'See what you have actually mastered, and what still needs work.',
];

export default function Landing() {
  const { user } = useAuth();
  const ctaTo = user ? '/dashboard' : '/register';

  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-surface to-canvas">
        <div className="container-page max-w-7xl grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24 xl:gap-20 2xl:py-28">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5 text-secondary" aria-hidden="true" /> AI study assistant for students
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-6xl 2xl:text-7xl">
              Learn smarter.
              <br />
              <span className="text-secondary">Know more.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted lg:text-xl">
              Upload your study PDFs, ask questions, and get answers that point back to the exact page. Then turn the same material into quizzes and a study plan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={ctaTo} className="btn btn-primary px-5 py-3 text-base">
                {user ? 'Open dashboard' : 'Create free account'} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a href="#how-it-works" className="btn btn-secondary px-5 py-3 text-base">
                See how it works
              </a>
            </div>
            <p className="mt-4 text-sm text-muted">Works with text-based PDFs. Scanned, image-only PDFs are not supported yet.</p>
          </div>
          <HeroIllustration className="mx-auto h-auto w-full max-w-2xl" />
        </div>
      </section>

      <section id="features" className="scroll-mt-20 py-16 sm:py-20">
        <div className="container-page max-w-7xl lg:py-8">
          <h2 className="max-w-3xl text-3xl font-semibold lg:text-4xl">Everything you need to study from your own material</h2>
          <p className="mt-3 max-w-2xl text-muted">Five tools that share one source of truth: the documents you upload.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className={`card p-6 ${i === 0 ? 'lg:col-span-2' : ''}`}>
                <span className="grid size-10 place-items-center rounded-md bg-primary text-white">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-[15px] text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-surface py-16 sm:py-20">
        <div className="container-page max-w-7xl">
          <h2 className="text-3xl font-semibold lg:text-4xl">How it works</h2>
          <p className="mt-3 max-w-2xl text-muted">Retrieval-augmented generation: the model only sees the passages that matter for your question.</p>
          <ol className="mt-10 grid gap-8 md:grid-cols-3 lg:mt-14 lg:gap-12">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full border border-secondary/30 bg-secondary/10 text-secondary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-semibold text-muted">Step {i + 1}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-[15px] text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container-page max-w-7xl grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <h2 className="text-3xl font-semibold lg:text-4xl">Built for how students actually revise</h2>
            <ul className="mt-6 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px]">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-secondary" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div id="privacy" className="card scroll-mt-24 p-6 lg:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-md bg-success/10 text-success-ink">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <h3 className="text-lg font-semibold">Privacy and limits, plainly</h3>
            </div>
            <ul className="mt-4 space-y-2.5 text-[15px] text-muted">
              <li>Your documents, chats, quizzes and plans are visible only to your account.</li>
              <li>Passwords are stored as salted hashes. API keys never reach your browser.</li>
              <li>Text from your documents is sent to Google Gemini to create embeddings and answers.</li>
              <li>AI can be wrong. Use the citations to verify anything important.</li>
              <li>Scanned PDFs without a text layer cannot be read (no OCR).</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-primary">
        <div className="container-page max-w-7xl flex flex-col items-start justify-between gap-6 py-12 sm:flex-row sm:items-center lg:py-16">
          <div>
            <h2 className="text-2xl font-semibold !text-white">Start with one PDF.</h2>
            <p className="mt-1 text-white/75">Upload your notes and ask your first question in a couple of minutes.</p>
          </div>
          <Link to={ctaTo} className="btn bg-white px-5 py-3 text-primary hover:bg-canvas">
            {user ? 'Open dashboard' : 'Create free account'} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
