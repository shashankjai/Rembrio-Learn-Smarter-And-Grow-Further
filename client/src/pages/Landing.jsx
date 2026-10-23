import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck,
  ChartColumn,
  ClipboardCheck,
  FileSearch,
  FileUp,
  MessageSquareQuote,
  Quote,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import useReveal from '../hooks/useReveal.js';

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

function Reveal({ as: Tag = 'section', className = '', children, id }) {
  const [ref, visible] = useReveal();
  return (
    <Tag ref={ref} id={id} className={`reveal ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </Tag>
  );
}

function SectionTitle({ eyebrow, children }) {
  return (
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="section-title mt-3">{children}</h2>
      <span className="section-title-bar mt-5 block h-1 w-12 rounded-full bg-secondary" aria-hidden="true" />
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const ctaTo = user ? '/dashboard' : '/register';

  return (
    <>
      <section className="overflow-hidden border-b border-line bg-canvas">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10 grid items-center gap-6 pt-0 pb-6 sm:pt-1 sm:pb-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-6 lg:pt-1 lg:pb-8 xl:gap-8 xl:pt-1 xl:pb-10">
          <div className="relative z-10">
            <p className="hero-item eyebrow inline-flex items-center gap-2" style={{ '--hero-delay': '0ms' }}>
              <span className="size-2 rounded-full bg-secondary" aria-hidden="true" />
              AI study assistant for students
            </p>
            <h1 className="hero-item hero-title mt-5" style={{ '--hero-delay': '90ms' }}>
              <span className="block">Learn smarter.</span>
              <span className="hero-blue-line relative inline-block text-secondary">
                Know more.
                <svg className="hero-underline absolute -bottom-2 left-0 w-full" viewBox="0 0 340 20" fill="none" aria-hidden="true">
                  <path className="hero-underline-path" d="M5 14C91 4 243 3 333 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="hero-item mt-6 max-w-xl xl:max-w-2xl text-base leading-7 text-muted sm:text-lg sm:leading-8" style={{ '--hero-delay': '180ms' }}>
              Upload your study PDFs, ask questions, and get answers that point back to the exact page. Then turn the same material into quizzes and a study plan.
            </p>
            <div className="hero-item mt-7 flex flex-wrap gap-3" style={{ '--hero-delay': '270ms' }}>
              <Link to={ctaTo} className="btn btn-primary rounded-full px-5 text-base">
                {user ? 'Open dashboard' : 'Create free account'}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <a href="#how-it-works" className="btn btn-secondary rounded-full px-5 text-base">
                See how it works
              </a>
            </div>
            <p className="hero-item mt-4 text-sm text-muted" style={{ '--hero-delay': '360ms' }}>
              Works with text-based PDFs. Scanned, image-only PDFs are not supported yet.
            </p>
          </div>
          <div className="hero-art relative aspect-[1.44/1] w-full max-w-[620px] lg:max-w-[740px] xl:max-w-[820px] overflow-hidden ml-auto mr-0 justify-self-end" aria-hidden="false">
            <img
              className="hero-art-image mix-blend-multiply"
              src="/images/rembrio-hero.png"
              width="1536"
              height="1024"
              fetchPriority="high"
              alt="A student in a blue hoodie studies at a laptop as PDF, Word and image files flow through a RAG database into an AI chat."
            />
          </div>
        </div>
      </section>

      <div className="border-b border-line bg-canvas">
        <div className="container-page max-w-7xl">
          <ul className="grid grid-cols-2 divide-x divide-y divide-line border-x border-line sm:grid-cols-4 sm:divide-y-0">
            {[
              [Quote, 'Page-level citations'],
              [ClipboardCheck, 'Quizzes from your PDFs'],
              [CalendarCheck, 'Study plans'],
              [ChartColumn, 'Progress tracking'],
            ].map(([Icon, label]) => (
              <li key={label} className="flex min-h-16 items-center gap-3 px-3 py-4 text-sm font-semibold text-ink sm:justify-center sm:px-3 sm:text-base">
                <Icon className="size-5 shrink-0 text-secondary" aria-hidden="true" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Reveal id="features" className="scroll-mt-20 border-b border-line bg-alt py-16 sm:py-20">
        <div className="container-page grid max-w-7xl gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <SectionTitle eyebrow="What you can do">Study from your material.</SectionTitle>
            <img
              src="/images/heroin.png"
              width="1536"
              height="1024"
              className="mt-14 w-[calc(100vw-2rem)] max-w-full mix-blend-multiply sm:mt-14 sm:w-[38rem]"
              alt="A student studying from digital notes with a laptop and books."
            />
            <p className="mt-5 max-w-sm text-muted">Five tools that share one source of truth: the documents you upload.</p>
          </div>
          <div className="reveal-stagger grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <article key={title} className={`feature-card card card-hover relative overflow-hidden p-5 ${i === 0 ? 'sm:col-span-2' : ''}`} style={{ '--stagger-index': i }}>
                <span className="grid size-10 place-items-center rounded-lg bg-tint text-secondary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal id="how-it-works" className="scroll-mt-20 border-b border-line bg-canvas py-16 sm:py-20">
        <div className="container-page max-w-7xl">
          <div className="mx-auto max-w-xl text-center">
            <p className="eyebrow">Simple by design</p>
            <h2 className="section-title mx-auto mt-3">How it works</h2>
            <span className="section-title-bar mx-auto mt-5 block h-1 w-12 rounded-full bg-secondary" aria-hidden="true" />
            <p className="mt-4 text-muted">Retrieval-augmented generation: the model only sees the passages that matter for your question.</p>
          </div>
          <ol className="reveal-stagger mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="card card-hover p-5 sm:p-6" style={{ '--stagger-index': i }}>
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-lg bg-tint text-secondary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-xs font-medium tracking-widest text-secondary">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      <Reveal id="privacy" className="scroll-mt-20 border-b border-line bg-alt py-16 sm:py-20">
        <div className="container-page grid max-w-7xl gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <SectionTitle eyebrow="For everyday revision">Built for focused learning.</SectionTitle>
            <ul className="mt-6 space-y-3">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm leading-6 text-ink">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-secondary" aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <article className="card card-hover p-6 lg:col-span-8 lg:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-tint text-secondary">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="eyebrow">Privacy &amp; limitations</p>
                <h3 className="mt-1 text-xl">Privacy and limits, plainly</h3>
              </div>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-muted">
              <li>Your documents, chats, quizzes and plans are visible only to your account.</li>
              <li>Passwords are stored as salted hashes. API keys never reach your browser.</li>
              <li>Text from your documents is sent to Google Gemini to create embeddings and answers.</li>
              <li>AI can be wrong. Use the citations to verify anything important.</li>
              <li>Scanned PDFs without a text layer cannot be read (no OCR).</li>
            </ul>
          </article>
        </div>
      </Reveal>

      <section className="border-y border-line bg-tint py-12 sm:py-14">
        <div className="container-page flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow">Your next study session</p>
            <h2 className="mt-2 text-3xl sm:text-4xl">Start with one PDF.</h2>
            <p className="mt-2 text-muted">Upload your notes and ask your first question in a couple of minutes.</p>
          </div>
          <Link to={ctaTo} className="btn btn-primary rounded-full px-5 text-base">
            {user ? 'Open dashboard' : 'Create free account'} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
