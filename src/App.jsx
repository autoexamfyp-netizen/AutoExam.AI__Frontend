import { Link } from "react-router-dom"
import {
  BookOpenText,
  Bot,
  Building2,
  ClipboardCheck,
  FileUp,
  GraduationCap,
  LineChart,
  MessageSquareText,
  MonitorCheck,
  School,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react"

function smoothScrollToHash(hash, { duration = 1000, offset = 88 } = {}) {
  if (!hash || !hash.startsWith("#")) return
  const target = document.querySelector(hash)
  if (!target) return

  const startY = window.scrollY
  const endY = Math.max(0, target.getBoundingClientRect().top + startY - offset)
  const delta = endY - startY
  if (Math.abs(delta) < 2) return

  // Longer travel gets a bit more time so transitions feel consistently smooth.
  const distance = Math.abs(delta)
  const adaptiveDuration = Math.max(700, Math.min(1400, duration + distance * 0.25))

  const startTime = performance.now()
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

  const step = (now) => {
    const elapsed = now - startTime
    const progress = Math.min(1, elapsed / adaptiveDuration)
    const eased = easeInOutCubic(progress)
    window.scrollTo(0, startY + delta * eased)
    if (progress < 1) {
      window.requestAnimationFrame(step)
      return
    }
    history.replaceState(null, "", hash)
  }

  window.requestAnimationFrame(step)
}

const capabilityCards = [
  {
    icon: Sparkles,
    title: "AI Question Generation",
    text: "GPT-powered questions across Bloom's Taxonomy levels - from recall to evaluation.",
  },
  {
    icon: LineChart,
    title: "Semantic Evaluation",
    text: "Embedding similarity + keyword matching + LLM rubric grading for fair scores.",
  },
  {
    icon: ShieldCheck,
    title: "AI Answer Detection",
    text: "GPTZero integration flags AI-written submissions above 70% confidence.",
  },
  {
    icon: MessageSquareText,
    title: "Personalized Feedback",
    text: "Topic-wise breakdown with strengths, mistakes, and improvement suggestions.",
  },
  {
    icon: ClipboardCheck,
    title: "Teacher Dashboard",
    text: "Full exam lifecycle with analytics, publication, and submissions overview.",
  },
  {
    icon: GraduationCap,
    title: "Student Portal",
    text: "Clean timed interface with auto-save and submission progress tracking.",
  },
]

const workflowSteps = [
  {
    icon: FileUp,
    title: "Upload Content",
    text: "Upload your PDF, paste text, or provide a URL of course material.",
  },
  {
    icon: Bot,
    title: "AI Generates Questions",
    text: "GPT-powered MCQs, short-answer, and essay questions across Bloom's Taxonomy.",
  },
  {
    icon: ClipboardCheck,
    title: "Review & Publish",
    text: "Edit, reorder, configure timer and marks, then publish to students.",
  },
  {
    icon: MonitorCheck,
    title: "Students Attempt Exam",
    text: "Browser-based timed interface with auto-save and progress tracking.",
  },
  {
    icon: BookOpenText,
    title: "Auto-Evaluation & Feedback",
    text: "Semantic scoring, AI detection, and personalized feedback reports.",
  },
]

const audienceCards = [
  {
    title: "Universities & Colleges",
    text: "Handle large cohorts with automated assessment at scale. Reduce faculty workload while maintaining academic rigor across departments.",
    points: ["Bulk exam generation", "Department-level analytics", "AI plagiarism monitoring"],
  },
  {
    title: "Schools",
    text: "Give teachers time back with instant paper generation. Create fair, consistent exams for every grade level and subject.",
    points: ["Grade-specific templates", "Instant paper creation", "Parent progress reports"],
  },
  {
    title: "Individual Educators",
    text: "Run fair, consistent exams effortlessly. Whether you teach 10 students or 100, AutoExam scales with your needs.",
    points: ["One-click generation", "Personalized feedback", "No setup overhead"],
  },
]

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#7c5cff] text-white">
        <img src="/school-white.png" alt="" className="h-4 w-4" />
      </div>
      <span className="text-xl font-semibold tracking-[-0.2px] text-white sm:text-2xl">
        AutoExam.ai
      </span>
    </div>
  )
}

function Navbar() {
  const links = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Demo", href: "#demo" },
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
  ]

  const handleNavScroll = (event, href) => {
    if (!href?.startsWith("#")) return
    event.preventDefault()
    smoothScrollToHash(href)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b1538]/95 backdrop-blur">
      <nav className="mx-auto flex h-[78px] w-full max-w-[1220px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <a href="#home" className="inline-flex" onClick={(e) => handleNavScroll(e, "#home")}>
          <Logo />
        </a>
        <ul className="hidden items-center gap-8 text-sm font-medium text-[#c4cde4] lg:flex">
          {links.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                onClick={(e) => handleNavScroll(e, item.href)}
                className="cursor-pointer transition hover:text-white"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4 sm:gap-5">
          <Link
            to="/login"
            className="hidden text-sm font-semibold text-white transition hover:text-white/90 sm:inline-block"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="rounded-xl bg-[#6e5cf7] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(110,92,247,0.4)] transition hover:bg-[#5f54e8] sm:px-6"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section id="home" className="scroll-mt-24 relative overflow-hidden bg-[#081334] pb-14 pt-10 sm:pb-20 sm:pt-14">
      <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(117,89,255,0.35)_0,transparent_35%),radial-gradient(circle_at_70%_30%,rgba(68,110,255,0.25)_0,transparent_36%)]" />
      <div className="relative mx-auto grid w-full max-w-[1220px] grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-10">
        <div>
          <div className="inline-flex rounded-full border border-[#7e89aa]/30 bg-[#1a264f]/70 px-4 py-2 text-xs text-[#c8d0e7] sm:text-sm">
            Trusted by 50+ Pakistani institutions
          </div>
          <h1 className="mt-6 max-w-[620px] text-4xl leading-tight font-bold tracking-[-0.8px] text-white sm:text-5xl lg:text-6xl">
            AI-Powered Exam Generation for Modern Educators
          </h1>
          <p className="mt-5 max-w-[620px] text-base leading-7 text-[#b3bed8] sm:text-lg sm:leading-8">
            Automate paper setting, semantic grading, detect AI-written answers, and deliver personalized feedback - all in one platform.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-2xl bg-[#6e5cf7] px-7 py-3 text-base font-semibold text-white transition hover:bg-[#5f54e8] sm:px-8 sm:text-lg"
            >
              Get Started Free
            </Link>
            <button
              type="button"
              onClick={() => smoothScrollToHash("#how-it-works")}
              className="rounded-2xl border border-[#5b678a] px-7 py-3 text-base font-semibold text-white transition hover:bg-white/10 sm:px-8 sm:text-lg"
            >
              See How It Works
            </button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[580px] rounded-[24px] border border-[#8fa4ff]/30 bg-[#f4f5f9] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="flex h-[360px] w-full overflow-hidden rounded-[20px] border border-[#d5d9e5] bg-white sm:h-[400px]">
            <div className="w-[42%] bg-gradient-to-b from-[#6a5ef6] to-[#3f46d9] p-6 text-white">
              <ul className="space-y-4 text-sm font-medium sm:text-base">
                <li>Upload</li>
                <li>Generate</li>
                <li>Exams</li>
                <li>AI Detection</li>
                <li>Analytics</li>
              </ul>
            </div>
            <div className="flex-1 bg-[#f8f9fd] p-5">
              <h3 className="text-lg font-semibold text-[#1b2544] sm:text-xl">Generated Questions</h3>
              <div className="mt-4 space-y-3 text-xs text-[#33405f] sm:text-sm">
                <div className="rounded-xl border border-[#d9deea] bg-white p-4">Explain the process of photosynthesis</div>
                <div className="rounded-xl border border-[#d9deea] bg-white p-4">Compare mitosis and meiosis in detail</div>
                <div className="rounded-xl border border-[#d9deea] bg-white p-4">Evaluate the impact of climate change</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionHeading({ label, title, dark = false }) {
  return (
    <div className="mx-auto max-w-[920px] text-center">
      <p className={`text-[11px] tracking-[0.28em] uppercase sm:text-xs ${dark ? "text-[#8a96bf]" : "text-[#70789d]"}`}>{label}</p>
      <h2 className={`mt-3 text-3xl leading-tight font-bold tracking-[-0.6px] sm:mt-4 sm:text-4xl lg:text-5xl ${dark ? "text-white" : "text-[#0f1730]"}`}>
        {title}
      </h2>
    </div>
  )
}

function CapabilitiesSection() {
  return (
    <section id="features" className="scroll-mt-24 bg-[#f4f6fb] px-4 py-14 sm:px-6 sm:py-20">
      <SectionHeading label="CAPABILITIES" title="Everything a Modern Assessment Platform Needs" />
      <div className="mx-auto mt-10 grid w-full max-w-[1220px] grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {capabilityCards.map((item) => {
          const Icon = item.icon
          return (
          <article key={item.title} className="rounded-3xl border border-[#e7eaf3] bg-white p-8 shadow-[0_10px_24px_rgba(27,39,94,0.06)]">
            <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#744fff] text-white shadow-sm">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl leading-snug font-semibold text-[#101935] sm:text-2xl">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#5d6580] sm:text-base">{item.text}</p>
          </article>
          )
        })}
      </div>
    </section>
  )
}

function ProblemSection() {
  const cards = [
    {
      icon: ClipboardCheck,
      title: "Manual Paper Creation Wastes Hours",
      text: "Teachers spend 8 to 12 hours crafting each exam from scratch, typing questions, formatting, and proofreading - time that could go toward actual teaching.",
    },
    {
      icon: BookOpenText,
      title: "Zero Post-Exam Learning Feedback",
      text: "Students receive only a numeric score. There is no explanation of what they got wrong, why it was wrong, or how to improve.",
    },
    {
      icon: ShieldCheck,
      title: "AI Cheating Goes Undetected",
      text: "With ChatGPT and other AI tools, students can generate perfect answers in seconds. Traditional plagiarism checkers cannot flag AI-written text.",
    },
  ]
  return (
    <section id="challenge" className="scroll-mt-24 bg-[#081334] px-4 py-14 sm:px-6 sm:py-20">
      <SectionHeading label="THE CHALLENGE" title="The Problem with How We Assess Today" dark />
      <div className="mx-auto mt-10 grid w-full max-w-[1220px] grid-cols-1 gap-6 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
          <article key={card.title} className="rounded-3xl border border-[#24335f] bg-[#162147] p-8">
            <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#1f2b58] text-white">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-2xl leading-tight font-semibold text-white sm:text-[28px]">{card.title}</h3>
            <p className="mt-4 text-sm leading-7 text-[#c2cae3] sm:text-base">{card.text}</p>
          </article>
          )
        })}
      </div>
    </section>
  )
}

function WorkflowSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 bg-[#f4f6fb] px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto w-full max-w-[1220px]">
        <div>
          <p className="text-[11px] tracking-[0.28em] text-[#70789d] uppercase sm:text-xs">WORKFLOW</p>
          <h2 className="mt-3 max-w-[790px] text-3xl leading-tight font-bold tracking-[-0.6px] text-[#111a37] sm:mt-4 sm:text-4xl lg:text-5xl">
            From Course Material to Complete Exam - In Minutes
          </h2>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-5">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon
            return (
            <article key={step.title} className="rounded-3xl border border-[#e7eaf3] bg-white p-7">
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-full bg-[#6e5cf7] text-lg font-bold text-white">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-xl leading-snug font-semibold text-[#111a37] sm:text-2xl">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[#5f6780] sm:text-base">{step.text}</p>
            </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function StackSection() {
  const tags = ["React.js", "TailwindCSS", "FastAPI", "PostgreSQL", "Supabase", "OpenAI GPT", "Hugging Face", "GPTZero", "Vercel", "Render"]
  return (
    <section id="demo" className="scroll-mt-24 bg-[#081334] px-4 py-14 sm:px-6 sm:py-20">
      <h2 className="text-center text-3xl font-bold tracking-[-0.6px] text-white sm:text-4xl lg:text-5xl">
        Built on a Modern, Scalable Stack
      </h2>
      <div className="mx-auto mt-10 flex w-full max-w-[960px] flex-wrap justify-center gap-4">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full border border-[#2c3b67] bg-[#18244a] px-5 py-2.5 text-sm text-[#e5e9f9] sm:text-base">
            {tag}
          </span>
        ))}
      </div>
    </section>
  )
}

function AudienceSection() {
  const audienceCardsWithIcons = [
    {
      icon: Building2,
      title: "Universities & Colleges",
      text: "Handle large cohorts with automated assessment at scale. Reduce faculty workload while maintaining academic rigor across departments.",
      points: ["Bulk exam generation", "Department-level analytics", "AI plagiarism monitoring"],
    },
    {
      icon: School,
      title: "Schools",
      text: "Give teachers time back with instant paper generation. Create fair, consistent exams for every grade level and subject.",
      points: ["Grade-specific templates", "Instant paper creation", "Parent progress reports"],
    },
    {
      icon: UsersRound,
      title: "Individual Educators",
      text: "Run fair, consistent exams effortlessly. Whether you teach 10 students or 100, AutoExam scales with your needs.",
      points: ["One-click generation", "Personalized feedback", "No setup overhead"],
    },
  ]

  return (
    <section id="about" className="scroll-mt-24 bg-[#f4f6fb] px-4 py-14 sm:px-6 sm:py-20">
      <SectionHeading label="WHO IT IS FOR" title="Trusted Across Education" />
      <div className="mx-auto mt-10 grid w-full max-w-[1220px] grid-cols-1 gap-6 lg:grid-cols-3">
        {audienceCardsWithIcons.map((card) => {
          const Icon = card.icon
          return (
          <article key={card.title} className="rounded-3xl border border-[#e7eaf3] bg-white p-8">
            <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#ebe8ff] text-[#5f4ce6]">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-2xl leading-tight font-semibold text-[#101a38] sm:text-[28px]">{card.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#5d6580] sm:text-base">{card.text}</p>
            <ul className="mt-6 space-y-3">
              {card.points.map((point) => (
                <li key={point} className="text-sm text-[#213159] sm:text-base">
                  ✓ {point}
                </li>
              ))}
            </ul>
          </article>
          )
        })}
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="bg-gradient-to-r from-[#6271ff] to-[#a132f7] px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-[1060px] text-center">
        <h2 className="text-3xl leading-tight font-bold tracking-[-0.6px] text-white sm:text-4xl lg:text-5xl">
          Start Automating Your Exams Today
        </h2>
        <p className="mt-3 text-base text-[#ebedff] sm:text-xl">
          Free during beta - No credit card required
        </p>
        <div className="mx-auto mt-8 flex w-full max-w-[760px] flex-col gap-4 sm:flex-row">
          <input
            type="email"
            placeholder="Enter your email"
            className="h-14 flex-1 rounded-2xl border-none bg-white px-6 text-base text-[#1f2747] outline-none"
          />
          <button className="h-14 rounded-2xl bg-[#081334] px-8 text-base font-semibold text-white">
            Request Early Access
          </button>
        </div>
        <p className="mt-5 text-sm text-[#e8ebff]">Your data is secure and never shared</p>
      </div>
    </section>
  )
}

function Footer() {
  const socialIcons = [Sparkles, GraduationCap]
  const columns = [
    { title: "PRODUCT", items: ["Features", "How It Works", "Pricing"] },
    { title: "COMPANY", items: ["About", "Contact", "Careers"] },
    { title: "RESOURCES", items: ["Documentation", "Blog", "Support"] },
  ]
  return (
    <footer id="contact" className="scroll-mt-24 bg-[#1a2745] px-4 pb-10 pt-12 sm:px-6 sm:pt-16">
      <div className="mx-auto w-full max-w-[1220px]">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 text-base text-[#a7b2cf]">Smarter Exams. Fairer Feedback. Powered by AI.</p>
            <div className="mt-6 flex gap-3">
              {socialIcons.map((Icon) => (
                <div key={Icon.displayName || Icon.name} className="grid h-12 w-12 place-items-center rounded-xl bg-[#273454] text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-xs tracking-[0.18em] text-[#7884a8]">{column.title}</p>
              <ul className="mt-5 space-y-4">
                {column.items.map((item) => (
                  <li key={item} className="text-base text-[#e4e9f8]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-[#2b395c] pt-7 text-sm text-[#9ca9ca]">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p>© 2025 AutoExam.ai · COMSATS University Islamabad, Lahore Campus</p>
            <div className="flex gap-8">
              <span>Privacy</span>
              <span>Terms</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

function App() {
  return (
    <main className="marketing-typography min-h-screen">
      <Navbar />
      <Hero />
      <CapabilitiesSection />
      <ProblemSection />
      <WorkflowSection />
      <StackSection />
      <AudienceSection />
      <CTASection />
      <Footer />
    </main>
  )
}

export default App
