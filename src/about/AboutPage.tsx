import { ExternalLink } from '../components/ExternalLink'
import './about.css'

const ORCA_SOURCES = [
  {
    label: 'ORCA DEXTERITY',
    detail: 'Official project and hardware context',
    url: 'https://www.orcahand.com/',
  },
  { label: 'ORCA GITHUB', detail: 'Open-source organization', url: 'https://github.com/orcahand' },
  {
    label: 'ORCA_UI',
    detail: 'URDF, mesh assets, and browser loader foundation',
    url: 'https://github.com/orcahand/orca_ui',
  },
] as const

const LANGUAGE_SOURCES = [
  {
    label: 'HANDSPEAK',
    detail: 'Native-signer ASL lexical video references',
    url: 'https://www.handspeak.com/',
  },
  {
    label: 'ASL-LEX 2.0',
    detail: 'ASL phonological and lexical parameters',
    url: 'https://asl-lex.org/visualization/',
  },
  { label: 'SIGNASL', detail: 'Secondary ASL video references', url: 'https://www.signasl.org/' },
  {
    label: 'ASL SIGNBANK',
    detail: 'ASL lexical reference entries',
    url: 'https://aslsignbank.com/',
  },
  {
    label: 'UZH ACCESSIBILITY',
    detail: 'Swiss sign-language research resources',
    url: 'https://www.cl.uzh.ch/en/research-groups/accessibility/resources.html',
  },
  {
    label: 'ZURICHNLP',
    detail: 'Machine-readable ASL and DSGS pose geometry',
    url: 'https://github.com/sign-language-processing/spoken-to-signed-translation',
  },
] as const

const PIPELINE = [
  [
    '01',
    'INPUT',
    'English or German text stays in browser memory and is capped before processing.',
  ],
  [
    '02',
    'PLAN',
    'Known lexemes use explicit motion tracks; unknown words fall back to fingerspelling.',
  ],
  ['03', 'RENDER', 'Two independent ORCA URDF instances animate dominant and support-hand tracks.'],
  [
    '04',
    'CHECK',
    'Mechanical rules inspect hand count, pose, path, relationship, and source presence.',
  ],
] as const

export function AboutPage({ onOpenLab }: { onOpenLab(): void }) {
  return (
    <main className="about-page">
      <nav className="about-nav" aria-label="Project navigation">
        <button type="button" onClick={onOpenLab}>
          <svg aria-hidden="true" viewBox="0 0 16 16">
            <path d="m10 3-5 5 5 5" />
          </svg>
          OPEN MOTION LAB
        </button>
        <span>INDEPENDENT LEARNING PROTOTYPE</span>
      </nav>

      <header className="about-hero">
        <div>
          <p>ORCA HAND · PRODUCT + ENGINEERING STUDY</p>
          <h1>
            Sign motion,
            <br />
            <span>made inspectable.</span>
          </h1>
        </div>
        <p className="about-intro">
          A source-backed browser prototype exploring how the open ORCA Hand model can express one-
          and two-hand sign cues while keeping motion assumptions, fallbacks, and verification
          limits visible.
        </p>
      </header>

      <section className="about-purpose" aria-labelledby="why-title">
        <div className="about-section-index">01 / WHY</div>
        <div>
          <h2 id="why-title">Built to understand the product by building with it.</h2>
          <p>
            The hand is central to how people communicate and interact with the world. This study
            asks a practical question: can an accessible browser tool turn source references into
            inspectable robotic motion without hiding uncertainty behind a polished “translation”
            claim?
          </p>
          <p>
            The result is deliberately local-first and transparent. It shows which words have motion
            tracks, when fingerspelling is used, how each hand moves, and what still requires review
            by Deaf signers fluent in ASL or DSGS.
          </p>
          <p>
            <ExternalLink href="https://github.com/Devpen787/orca-sign-lab">
              Explore the code, learning notes and feedback issues
            </ExternalLink>
          </p>
        </div>
      </section>

      <section className="about-pipeline" aria-labelledby="pipeline-title">
        <div className="about-section-index">02 / SYSTEM</div>
        <div>
          <h2 id="pipeline-title">A small, explicit motion pipeline.</h2>
          <ol>
            {PIPELINE.map(([index, label, detail]) => (
              <li key={label}>
                <span>{index}</span>
                <strong>{label}</strong>
                <p>{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="about-sources" aria-labelledby="sources-title">
        <div className="about-section-index">03 / SOURCES</div>
        <div>
          <h2 id="sources-title">Built on open work, referenced at the point of use.</h2>
          <div className="source-group">
            <h3>ORCA FOUNDATION</h3>
            {ORCA_SOURCES.map((source) => (
              <ExternalLink href={source.url} key={source.url}>
                <b>{source.label}</b>
                <span>{source.detail}</span>
              </ExternalLink>
            ))}
          </div>
          <div className="source-group">
            <h3>LANGUAGE + MOTION REFERENCES</h3>
            {LANGUAGE_SOURCES.map((source) => (
              <ExternalLink href={source.url} key={source.url}>
                <b>{source.label}</b>
                <span>{source.detail}</span>
              </ExternalLink>
            ))}
          </div>
        </div>
      </section>

      <section className="about-boundary" aria-labelledby="boundary-title">
        <div className="about-section-index">04 / BOUNDARY</div>
        <div>
          <h2 id="boundary-title">What this prototype does not claim.</h2>
          <p>
            This is an independent educational prototype built with ORCA Dexterity’s open model. It
            is not an official ORCA product and does not certify fluent ASL or DSGS translation.
            Hand geometry cannot represent facial grammar, body position, signing space, timing, or
            community comprehension on its own.
          </p>
          <button className="about-cta" type="button" onClick={onOpenLab}>
            TRY THE MOTION LAB
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="m6 3 5 5-5 5" />
            </svg>
          </button>
        </div>
      </section>

      <footer className="about-footer">
        <span>ORCA HAND SIGN LAB</span>
        <span>LOCAL PROCESSING · NO ACCOUNTS · NO ANALYTICS</span>
      </footer>
    </main>
  )
}
