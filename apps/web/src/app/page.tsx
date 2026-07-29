import {
  ArrowDown,
  ArrowRight,
  Check,
  Headphones,
  Mic2,
  Route,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";

import { AudioOrb } from "@/components/audio-orb";
import { Button } from "@/components/button";
import { MissionArtwork } from "@/components/mission-artwork";
import { MissionCard } from "@/components/mission-card";
import { SiteHeader } from "@/components/site-header";
import { missions } from "@/lib/missions";

export default function LandingPage() {
  return (
    <div className="public-site">
      <SiteHeader />
      <main id="main-content">
        <section className="hero">
          <div className="horizon horizon-one" aria-hidden="true" />
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">A voice-first English coach for the journey ahead</p>
              <h1>
                The world sounds different
                <span>when you’re ready to answer.</span>
              </h1>
              <p className="hero-lede">
                Practice the conversations that make travel feel possible—from immigration to a
                missing bag—in a space built for Indian voices.
              </p>
              <div className="hero-actions">
                <Button href="/preview" size="large">
                  <Mic2 aria-hidden="true" /> Try a 30-second preview
                </Button>
                <Button href="/waitlist" variant="secondary" size="large">
                  Join the closed beta
                </Button>
              </div>
              <p className="hero-note">
                <ShieldCheck aria-hidden="true" />
                Free beta · Adults 18+ · Preview audio never leaves your device
              </p>
            </div>

            <div className="hero-stage" aria-label="Voice practice preview">
              <div className="stage-topline">
                <span>Mission 01</span>
                <span>US Immigration · Coach Mode</span>
              </div>
              <div className="stage-art">
                <MissionArtwork slug="us-immigration" />
              </div>
              <div className="stage-dialogue">
                <span>Border officer</span>
                <p>“What is the purpose of your visit?”</p>
              </div>
              <AudioOrb state="recording" level={0.45} size="medium" />
              <div className="stage-caption">
                <i />
                <span>
                  <strong>Listening</strong>
                  Take your time. I’m here.
                </span>
              </div>
              <div className="stage-controls" aria-hidden="true">
                <span>
                  <Volume2 /> Repeat
                </span>
                <span>
                  <Sparkles /> Hint
                </span>
              </div>
            </div>
          </div>
          <a className="scroll-cue" href="#how-it-works">
            Discover how it works <ArrowDown aria-hidden="true" />
          </a>
        </section>

        <section className="proof-strip" aria-label="Product principles">
          <p>Designed around one useful question</p>
          <blockquote>“Can I complete this conversation when it really matters?”</blockquote>
          <div>
            <span><Check aria-hidden="true" /> Task-first practice</span>
            <span><Check aria-hidden="true" /> Indian-language hints</span>
            <span><Check aria-hidden="true" /> No accent erasure</span>
          </div>
        </section>

        <section className="section how-section" id="how-it-works">
          <div className="section-heading split">
            <div>
              <p className="eyebrow">Not another language lesson</p>
              <h2>Practice the moment, not the textbook.</h2>
            </div>
            <p>
              VishwaVaani builds usable independence through realistic missions, gentle repair
              practice, and one focused next step after every attempt.
            </p>
          </div>
          <div className="how-grid">
            <article>
              <span className="step-number">01</span>
              <Headphones aria-hidden="true" />
              <h3>Listen in context</h3>
              <p>Hear natural questions at a speed that matches your mode and level.</p>
            </article>
            <article>
              <span className="step-number">02</span>
              <Mic2 aria-hidden="true" />
              <h3>Answer in your own words</h3>
              <p>Use hints in Hindi, Tamil, Telugu, Bengali, or Marathi only when you need them.</p>
            </article>
            <article>
              <span className="step-number">03</span>
              <Route aria-hidden="true" />
              <h3>Recover and keep going</h3>
              <p>Learn to ask for repetition, confirm meaning, and complete the real task.</p>
            </article>
          </div>
        </section>

        <section className="section missions-section" id="missions">
          <div className="section-heading">
            <p className="eyebrow">Five journeys · one growing voice</p>
            <h2>Go where your English needs to work.</h2>
            <p>Every mission has a guided Coach Mode and a natural-speed Real-World Mode.</p>
          </div>
          <div className="mission-grid">
            {missions.map((mission, index) => (
              <MissionCard key={mission.slug} mission={mission} priority={index === 0} />
            ))}
          </div>
        </section>

        <section className="reading-section" id="principles">
          <div className="reading-quote">
            <p className="eyebrow">A clearer kind of feedback</p>
            <blockquote>
              “Your accent is not a mistake. Clarity is about being understood—and knowing what to
              do when you aren’t.”
            </blockquote>
          </div>
          <div className="principle-list">
            <article>
              <span>01</span>
              <div>
                <h3>Outcomes before scores</h3>
                <p>Did the hotel find your booking? Did the officer understand your plan?</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <h3>One obstacle at a time</h3>
                <p>A short drill follows each attempt, so feedback immediately becomes practice.</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <h3>Confidence through independence</h3>
                <p>Progress means fewer hints and successful variations—not a daily streak.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="cta-section">
          <div className="horizon horizon-two" aria-hidden="true" />
          <AudioOrb state="ready" size="small" />
          <p className="eyebrow">Your first mission is waiting</p>
          <h2>Find your voice before you need it.</h2>
          <p>Preview VishwaVaani now, or join the free closed beta.</p>
          <div className="hero-actions">
            <Button href="/preview" size="large">
              Try the voice preview <ArrowRight aria-hidden="true" />
            </Button>
            <Button href="/waitlist" variant="secondary" size="large">
              Request an invite
            </Button>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <strong>VishwaVaani</strong>
          <span>विश्ववाणी · Speak into the world</span>
        </div>
        <nav aria-label="Footer navigation">
          <a href="/preview">Voice preview</a>
          <a href="/waitlist">Closed beta</a>
          <a href="/privacy">Privacy</a>
          <a href="mailto:hello@vishwavaani.example">Contact</a>
        </nav>
        <small>© 2026 VishwaVaani. Built for real conversations.</small>
      </footer>
    </div>
  );
}
