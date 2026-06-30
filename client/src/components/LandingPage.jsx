import { useState, useEffect, useCallback } from 'react';
import useJoinRoom from '../hooks/useJoinRoom';
import useIntersectionObserver from '../hooks/useIntersectionObserver';
import DemoCanvas from './DemoCanvas';
import '../landing.css';

/* ═══════════════════════════════════════════════════════════════════
   Inline SVG Icon Components
   ═══════════════════════════════════════════════════════════════════ */

function LogoIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Canvas frame — two quick strokes */}
      <rect x="3" y="5" width="30" height="26" rx="4" stroke="#9B5DE5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0" />
      {/* Pen stroke — loose freehand line */}
      <path d="M9 24 C12 14, 16 22, 19 12 C22 6, 25 18, 28 15" stroke="#FF6B6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function ArrowRightIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 4C5 4 1.7 8 1 10c.7 2 4 6 9 6s8.3-4 9-6c-.7-2-4-6-9-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 4C5 4 1.7 8 1 10c.7 2 4 6 9 6s8.3-4 9-6c-.7-2-4-6-9-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 17L17 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ErrorCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   Hero Background Shapes
   ═══════════════════════════════════════════════════════════════════ */

const HERO_SHAPES = [
  // Rounded rectangles
  { type: 'rect', x: '8%',  y: '15%', color: '#FF6B6B', opacity: 0.07, anim: 'drift-up', delay: '0s' },
  { type: 'rect', x: '82%', y: '20%', color: '#9B5DE5', opacity: 0.06, anim: 'drift-down', delay: '0.3s' },
  { type: 'rect', x: '70%', y: '72%', color: '#FFBE0B', opacity: 0.08, anim: 'rotate', delay: '0.6s' },
  // Ellipses
  { type: 'ellipse', x: '20%', y: '70%', color: '#4ECDC4', opacity: 0.07, anim: 'drift-rotate', delay: '0.9s' },
  { type: 'ellipse', x: '88%', y: '55%', color: '#FF6B6B', opacity: 0.06, anim: 'drift-up', delay: '1.2s' },
  // Squiggles
  { type: 'squiggle', x: '55%', y: '12%', color: '#FFBE0B', opacity: 0.08, anim: 'rotate', delay: '0.4s' },
  { type: 'squiggle', x: '5%',  y: '48%', color: '#9B5DE5', opacity: 0.06, anim: 'drift-down', delay: '0.7s' },
  // Arrow lines
  { type: 'arrow', x: '40%', y: '80%', color: '#4ECDC4', opacity: 0.07, anim: 'drift-up', delay: '1.0s' },
  { type: 'arrow', x: '75%', y: '38%', color: '#FF6B6B', opacity: 0.06, anim: 'drift-rotate', delay: '0.5s' },
  // Extra shapes
  { type: 'rect', x: '35%', y: '8%',  color: '#4ECDC4', opacity: 0.05, anim: 'drift-down', delay: '1.5s' },
  { type: 'ellipse', x: '50%', y: '88%', color: '#9B5DE5', opacity: 0.07, anim: 'rotate', delay: '0.2s' },
];

function HeroShape({ shape }) {
  const animClass = `hero-shape--${shape.anim}`;
  const style = {
    left: shape.x,
    top: shape.y,
    animationDelay: shape.delay,
    '--shape-opacity': shape.opacity,
  };

  if (shape.type === 'rect') {
    return (
      <svg className={`hero-shape ${animClass}`} style={style} width="80" height="56" viewBox="0 0 80 56" fill="none">
        <rect x="2" y="2" width="76" height="52" rx="10" stroke={shape.color} strokeWidth="2" />
      </svg>
    );
  }
  if (shape.type === 'ellipse') {
    return (
      <svg className={`hero-shape ${animClass}`} style={style} width="70" height="50" viewBox="0 0 70 50" fill="none">
        <ellipse cx="35" cy="25" rx="33" ry="23" stroke={shape.color} strokeWidth="2" />
      </svg>
    );
  }
  if (shape.type === 'squiggle') {
    return (
      <svg className={`hero-shape ${animClass}`} style={style} width="90" height="30" viewBox="0 0 90 30" fill="none">
        <path d="M5 15 C15 5, 25 25, 35 15 C45 5, 55 25, 65 15 C75 5, 85 20, 88 15" stroke={shape.color} strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (shape.type === 'arrow') {
    return (
      <svg className={`hero-shape ${animClass}`} style={style} width="70" height="24" viewBox="0 0 70 24" fill="none">
        <path d="M4 12 H56" stroke={shape.color} strokeWidth="2" strokeLinecap="round" />
        <path d="M52 5L62 12L52 19" stroke={shape.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  return null;
}


/* ═══════════════════════════════════════════════════════════════════
   Step Illustrations (inline SVGs)
   ═══════════════════════════════════════════════════════════════════ */

function StepIllustration1() {
  // Cursor typing into a field
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" className="step-illustration">
      <rect x="10" y="35" width="100" height="28" rx="8" stroke="#9B5DE5" strokeWidth="2" />
      <line x1="20" y1="45" x2="55" y2="45" stroke="#FFBE0B" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="40" x2="60" y2="55" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round">
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
      </line>
      {/* Cursor arrow */}
      <path d="M75 20 L75 32 L79 28 L84 35 L87 33 L82 27 L87 26 Z" fill="#4ECDC4" stroke="#fff" strokeWidth="1" />
    </svg>
  );
}

function StepIllustration2() {
  // Two cursor arrows pointing at a lock
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" className="step-illustration">
      {/* Lock body */}
      <rect x="42" y="42" width="36" height="28" rx="4" stroke="#9B5DE5" strokeWidth="2" />
      {/* Lock shackle */}
      <path d="M50 42 V32 C50 24 70 24 70 32 V42" stroke="#9B5DE5" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Keyhole */}
      <circle cx="60" cy="54" r="3" fill="#9B5DE5" />
      <line x1="60" y1="57" x2="60" y2="63" stroke="#9B5DE5" strokeWidth="2" strokeLinecap="round" />
      {/* Cursor 1 */}
      <path d="M22 30 L22 44 L26 40 L30 46 L33 44 L29 38 L34 37 Z" fill="#FF6B6B" stroke="#fff" strokeWidth="1" />
      {/* Cursor 2 */}
      <path d="M92 35 L92 49 L96 45 L100 51 L103 49 L99 43 L104 42 Z" fill="#4ECDC4" stroke="#fff" strokeWidth="1" />
    </svg>
  );
}

function StepIllustration3() {
  // Two cursors drawing on a canvas
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" fill="none" className="step-illustration">
      {/* Canvas frame */}
      <rect x="15" y="10" width="90" height="65" rx="6" stroke="#e8e0d8" strokeWidth="1.5" />
      {/* Drawing strokes */}
      <path d="M30 40 C40 20, 50 50, 65 30" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" fill="none" />
      <rect x="60" y="40" width="30" height="20" rx="3" stroke="#4ECDC4" strokeWidth="2" fill="none" />
      <ellipse cx="45" cy="55" rx="12" ry="8" stroke="#FFBE0B" strokeWidth="2" fill="none" />
      {/* Cursor 1 */}
      <path d="M35 28 L35 40 L38.5 37 L42 42 L44.5 40.5 L41 36 L45 35 Z" fill="#FF6B6B" stroke="#fff" strokeWidth="0.8" />
      {/* Cursor 2 */}
      <path d="M78 38 L78 50 L81.5 47 L85 52 L87.5 50.5 L84 46 L88 45 Z" fill="#9B5DE5" stroke="#fff" strokeWidth="0.8" />
    </svg>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   Feature Marquee Data
   ═══════════════════════════════════════════════════════════════════ */

const FEATURES = [
  { label: 'Real-time cursors', color: 'coral' },
  { label: 'Password rooms', color: 'violet' },
  { label: 'Undo / Redo', color: 'sky' },
  { label: 'Freehand pen', color: 'amber' },
  { label: 'Chat', color: 'coral' },
  { label: 'Shapes & arrows', color: 'violet' },
  { label: 'No signup needed', color: 'sky' },
  { label: 'Text tool', color: 'amber' },
  { label: 'Zoom & pan', color: 'coral' },
  { label: 'Color picker', color: 'violet' },
];


/* ═══════════════════════════════════════════════════════════════════
   Join Section Floating Shapes
   ═══════════════════════════════════════════════════════════════════ */

function JoinFloatingShapes() {
  return (
    <div className="join-floating-shapes">
      <svg className="join-float-shape join-float-shape--1" width="60" height="42" viewBox="0 0 60 42" fill="none">
        <rect x="2" y="2" width="56" height="38" rx="8" stroke="#FF6B6B" strokeWidth="2" />
      </svg>
      <svg className="join-float-shape join-float-shape--2" width="50" height="36" viewBox="0 0 50 36" fill="none">
        <ellipse cx="25" cy="18" rx="23" ry="16" stroke="#4ECDC4" strokeWidth="2" />
      </svg>
      <svg className="join-float-shape join-float-shape--3" width="70" height="20" viewBox="0 0 70 20" fill="none">
        <path d="M5 10 C15 2, 25 18, 35 10 C45 2, 55 18, 65 10" stroke="#FFBE0B" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
      <svg className="join-float-shape join-float-shape--4" width="44" height="44" viewBox="0 0 44 44" fill="none">
        <rect x="2" y="2" width="40" height="40" rx="10" stroke="#9B5DE5" strokeWidth="2" />
      </svg>
      <svg className="join-float-shape join-float-shape--5" width="50" height="24" viewBox="0 0 50 24" fill="none">
        <path d="M4 12 H38" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" />
        <path d="M34 5L44 12L34 19" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <svg className="join-float-shape join-float-shape--6" width="40" height="30" viewBox="0 0 40 30" fill="none">
        <ellipse cx="20" cy="15" rx="18" ry="13" stroke="#4ECDC4" strokeWidth="2" />
      </svg>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   SVG Wobble Filter
   ═══════════════════════════════════════════════════════════════════ */

function WobbleFilter() {
  return (
    <svg className="landing-svg-filters" aria-hidden="true">
      <defs>
        <filter id="wobble-filter">
          <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" result="turbulence" seed="2" />
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const {
    roomName, setRoomName,
    password, setPassword,
    showPassword, setShowPassword,
    error, loading,
    handleSubmit,
  } = useJoinRoom();

  // Navbar scroll shadow
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Body class override for landing
  useEffect(() => {
    document.body.classList.add('landing-body');
    return () => document.body.classList.remove('landing-body');
  }, []);

  // Intersection observers
  const [stepsRef, stepsInView] = useIntersectionObserver({ threshold: 0.3 });
  const [demoRef, demoInView] = useIntersectionObserver({ threshold: 0.2 });
  const [joinRef, joinInView] = useIntersectionObserver({ threshold: 0.3 });

  // Demo phase state
  const [demoPhase, setDemoPhase] = useState(0);
  const handlePhaseChange = useCallback((phase) => {
    setDemoPhase(phase);
  }, []);

  // Smooth scroll helper
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const DEMO_CAPTIONS = [
    'Alex starts drawing a shape',
    'Sam jumps in with their own ideas',
    'The canvas fills up fast',
    'Everyone sees everything, instantly',
  ];

  // Map demo phases to caption indices
  const phaseToCaption = [0, 1, 2, 3, 3];

  return (
    <>
      <WobbleFilter />

      {/* ─── Navbar ─────────────────────────────────────────── */}
      <nav className={`landing-nav ${navScrolled ? 'nav-scrolled' : ''}`}>
        <div className="landing-nav-logo">
          <LogoIcon />
          <span className="landing-nav-logo-text">DoodleSync</span>
        </div>
        <button className="landing-nav-cta" onClick={() => scrollTo('join-section')}>
          Start Drawing <ArrowRightIcon size={14} />
        </button>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="landing-hero" id="hero">
        <div className="hero-shapes">
          {HERO_SHAPES.map((s, i) => (
            <HeroShape key={i} shape={s} />
          ))}
        </div>

        <h1 className="hero-headline">
          Your <span className="accent-coral">ideas</span> don't wait<br />
          for a <span className="accent-violet">meeting</span> room.<br />
          Just <span className="accent-amber">draw.</span>
        </h1>

        <p className="hero-subheadline">
          Draw, write, and diagram with your team in real time — just share a room name and password.
        </p>

        <div className="hero-ctas">
          <button className="hero-btn-primary wobbly" onClick={() => scrollTo('join-section')}>
            Start Drawing <ArrowRightIcon />
          </button>
          <button className="hero-btn-secondary wobbly" onClick={() => scrollTo('steps-section')}>
            See how it works
          </button>
        </div>
      </section>

      {/* ─── How It Works ───────────────────────────────────── */}
      <section className="steps-section" id="steps-section" ref={stepsRef}>
        <h2 className="steps-heading">How It Works</h2>

        <div className="steps-flow">
          {/* Step 1 */}
          <div className="step-card">
            <div className="step-number-circle">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="#FF6B6B" strokeWidth="2.5" strokeDasharray="12 4 8 4" fill="none" />
              </svg>
              <span className="step-number">1</span>
            </div>
            <StepIllustration1 />
            <div className="step-title">Pick a name for your room</div>
            <div className="step-desc">Any name works. It's your space.</div>
          </div>

          {/* Arrow 1→2 */}
          <svg className="step-arrow" viewBox="0 0 60 40" fill="none">
            <path
              className={`step-arrow-path ${stepsInView ? 'drawn' : ''}`}
              d="M4 20 Q30 8 56 20"
            />
            <path
              className={`step-arrow-path ${stepsInView ? 'drawn' : ''}`}
              d="M48 14 L56 20 L48 26"
              strokeDasharray="none"
              style={{ strokeDasharray: 'none', strokeDashoffset: 0, transition: 'none' }}
            />
          </svg>

          {/* Step 2 */}
          <div className="step-card">
            <div className="step-number-circle">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="#FFBE0B" strokeWidth="2.5" strokeDasharray="10 6 14 4" fill="none" />
              </svg>
              <span className="step-number">2</span>
            </div>
            <StepIllustration2 />
            <div className="step-title">Share the password</div>
            <div className="step-desc">Send it to whoever you want in the room.</div>
          </div>

          {/* Arrow 2→3 */}
          <svg className="step-arrow" viewBox="0 0 60 40" fill="none">
            <path
              className={`step-arrow-path ${stepsInView ? 'drawn' : ''}`}
              d="M4 20 Q30 32 56 20"
            />
            <path
              className={`step-arrow-path ${stepsInView ? 'drawn' : ''}`}
              d="M48 14 L56 20 L48 26"
              strokeDasharray="none"
              style={{ strokeDasharray: 'none', strokeDashoffset: 0, transition: 'none' }}
            />
          </svg>

          {/* Step 3 */}
          <div className="step-card">
            <div className="step-number-circle">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="#4ECDC4" strokeWidth="2.5" strokeDasharray="8 5 16 3" fill="none" />
              </svg>
              <span className="step-number">3</span>
            </div>
            <StepIllustration3 />
            <div className="step-title">Draw. Together. Right now.</div>
            <div className="step-desc">No loading, no waiting. It just works.</div>
          </div>
        </div>

        {/* Feature Marquee */}
        <div className="marquee-section">
          <div className="marquee-track">
            {/* Duplicate features for seamless loop */}
            {[...FEATURES, ...FEATURES].map((f, i) => (
              <span key={i} className={`marquee-pill marquee-pill--${f.color}`}>
                {f.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Demo Section ───────────────────────────────────── */}
      <section className="demo-section" id="demo-section" ref={demoRef}>
        <h2 className="demo-heading">Watch it happen</h2>
        <svg className="demo-underline" width="220" height="12" viewBox="0 0 220 12" fill="none">
          <path
            className={`demo-underline-path ${demoInView ? 'drawn' : ''}`}
            d="M4 8 C40 2, 80 10, 120 5 C160 0, 190 9, 216 6"
          />
        </svg>

        <div className="demo-layout">
          <div className="demo-canvas-wrapper">
            <DemoCanvas onPhaseChange={handlePhaseChange} />
          </div>

          <div className="demo-captions">
            {DEMO_CAPTIONS.map((caption, i) => (
              <div
                key={i}
                className={`demo-caption ${phaseToCaption[demoPhase] === i ? 'active' : ''}`}
              >
                {caption}
              </div>
            ))}
          </div>
        </div>

        <div className="demo-footer-text">
          No plugins. No accounts. No friction.
        </div>
      </section>

      {/* ─── Join Section ───────────────────────────────────── */}
      <section className="join-section" id="join-section" ref={joinRef}>
        <JoinFloatingShapes />

        <h2 className="join-section-heading">Ready to draw?</h2>
        <svg className="join-underline" width="180" height="12" viewBox="0 0 180 12" fill="none">
          <path
            className={`join-underline-path ${joinInView ? 'drawn' : ''}`}
            d="M4 8 C30 2, 70 10, 100 5 C130 0, 160 9, 176 6"
          />
        </svg>

        <div className="join-card-wrapper">
          {/* Sketchy SVG border */}
          <svg className="join-card-border-svg" viewBox="0 0 448 400" preserveAspectRatio="none">
            <rect
              className={`join-card-border-rect ${joinInView ? 'drawn' : ''} ${error ? 'error-border' : ''}`}
              x="4" y="4"
              width="440" height="392"
            />
          </svg>

          <div className="join-form-card">
            <form onSubmit={handleSubmit} className="join-form-inner">
              <div className="join-field-group">
                <label htmlFor="landing-roomName" className="join-field-label">Room Name</label>
                <div className="join-field-input-wrapper">
                  <input
                    id="landing-roomName"
                    type="text"
                    className="join-field-input"
                    placeholder="e.g. Design Sprint"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="join-field-group">
                <label htmlFor="landing-password" className="join-field-label">Password</label>
                <div className="join-field-input-wrapper">
                  <input
                    id="landing-password"
                    type={showPassword ? 'text' : 'password'}
                    className="join-field-input"
                    placeholder="Room password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="join-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="join-error-msg">
                  <ErrorCircleIcon />
                  {error}
                </div>
              )}

              <button type="submit" className="join-submit-btn" disabled={loading}>
                {loading ? <span className="join-spinner" /> : 'Join Room'}
              </button>
            </form>

            <p className="join-hint-text">
              No account needed. First one in sets the password.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="landing-footer">
        <strong>DoodleSync</strong> — Where ideas meet the canvas. Built with React, Yjs & love.
      </footer>
    </>
  );
}
