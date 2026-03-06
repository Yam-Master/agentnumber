"use client";

import Link from "next/link";
import "./landing.css";
import PhoneSim from "@/components/landing/phone-sim";
import TelegramDemo from "@/components/landing/telegram-demo";

export default function Home() {
  return (
    <div className="landing">
      {/* NAV */}
      <nav className="nav">
        <Link href="/" className="nav-logo">AGENT<span>[NUMBER]</span></Link>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link href="/docs">Docs</Link>
          <Link href="/signup" className="nav-cta">Get Started</Link>
        </div>
      </nav>

      {/* DATELINE */}
      <div className="dateline">
        <div className="dateline-left">
          <span>VOL. 1 &mdash; ISSUE 001 &mdash; 2026</span>
          <span className="red">BUILT FOR MACHINES</span>
        </div>
        <span>SAN FRANCISCO &bull; ON-CHAIN &bull; WORLDWIDE</span>
      </div>

      <hr className="double-rule" />

      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <h1 className="hero-headline">
            PHONE<br />NUMBERS<br />FOR <span className="red">AI<br />AGENTS</span>
          </h1>
          <div className="hero-byline">
            By the engineers who believe agents deserve phone numbers
          </div>
          <p className="hero-lede">
            One API call. A real phone number. <strong>SMS and voice</strong> for
            any AI agent, any framework. Pay with USDC on Base. No contracts, no
            KYC, no humans in the loop.
          </p>
          <div className="hero-ctas">
            <a href="#cta" className="btn-primary">Provision a Number</a>
            <Link href="/docs" className="btn-secondary">Read the API</Link>
          </div>
          <div className="hero-stats">
            <table>
              <tbody>
                <tr><td>Provision cost</td><td>$5 USDC</td></tr>
                <tr><td>SMS rate</td><td>$0.02 / message</td></tr>
                <tr><td>Voice rate</td><td>$0.05 / minute</td></tr>
                <tr><td>Settlement</td><td>Base L2</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="hero-right">
          <PhoneSim />
        </div>
      </section>

      <div className="dark-section">
        {/* MARQUEE */}
        <div className="marquee-wrap">
          <div className="marquee">
            <span>SMS + VOICE</span><span>&bull;</span>
            <span>PAY-AS-YOU-GO</span><span>&bull;</span>
            <span>USDC ON BASE</span><span>&bull;</span>
            <span>NO SIGNUP</span><span>&bull;</span>
            <span>ONE API CALL</span><span>&bull;</span>
            <span>REAL PHONE NUMBERS</span><span>&bull;</span>
            <span>BUILT FOR AGENTS</span><span>&bull;</span>
            <span>SMS + VOICE</span><span>&bull;</span>
            <span>PAY-AS-YOU-GO</span><span>&bull;</span>
            <span>USDC ON BASE</span><span>&bull;</span>
            <span>NO SIGNUP</span><span>&bull;</span>
            <span>ONE API CALL</span><span>&bull;</span>
            <span>REAL PHONE NUMBERS</span><span>&bull;</span>
            <span>BUILT FOR AGENTS</span><span>&bull;</span>
          </div>
        </div>

        {/* FEATURES STRIP */}
        <div className="features-strip" id="features">
          <div className="feat">
            <div className="feat-icon">&gt;_</div>
            <div className="feat-name">Real Numbers</div>
            <div className="feat-desc">Genuine US phone numbers. Not VoIP.</div>
          </div>
          <div className="feat">
            <div className="feat-icon">[ ]</div>
            <div className="feat-name">SMS</div>
            <div className="feat-desc">Send &amp; receive. Webhook delivery.</div>
          </div>
          <div className="feat">
            <div className="feat-icon">((*)</div>
            <div className="feat-name">Voice</div>
            <div className="feat-desc">AI voice calls powered by Vapi.</div>
          </div>
          <div className="feat">
            <div className="feat-icon">$__</div>
            <div className="feat-name">USDC</div>
            <div className="feat-desc">x402 payments on Base. No accounts.</div>
          </div>
        </div>

        {/* DEMO */}
        <section className="demo-section" id="code">
          <TelegramDemo />
        </section>

        {/* PRICING */}
        <section className="pricing" id="pricing">
          <div className="pricing-head">
            <h2>Simple, On-Chain Pricing</h2>
            <p>No subscriptions. No tiers. Pay for what you use, in USDC on Base.</p>
          </div>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-card-header">Phone Number</div>
              <div className="pricing-card-price">
                <div className="amount">$5</div>
                <div className="unit">USDC / number</div>
              </div>
              <div className="pricing-card-body">
                <ul>
                  <li>Real US phone number</li>
                  <li>SMS + Voice capable</li>
                  <li>Instant provisioning</li>
                  <li>Webhook configuration</li>
                  <li>One-time payment</li>
                </ul>
              </div>
            </div>
            <div className="pricing-card">
              <div className="pricing-card-header">SMS</div>
              <div className="pricing-card-price">
                <div className="amount">$0.02</div>
                <div className="unit">USDC / message</div>
              </div>
              <div className="pricing-card-body">
                <ul>
                  <li>Send + receive</li>
                  <li>Webhook delivery</li>
                  <li>Delivery confirmation</li>
                  <li>Unicode support</li>
                  <li>No monthly minimum</li>
                </ul>
              </div>
            </div>
            <div className="pricing-card">
              <div className="pricing-card-header">Voice</div>
              <div className="pricing-card-price">
                <div className="amount">$0.05</div>
                <div className="unit">USDC / message</div>
              </div>
              <div className="pricing-card-body">
                <ul>
                  <li>Inbound + outbound</li>
                  <li>AI voice via Vapi</li>
                  <li>Call recording</li>
                  <li>Transcription included</li>
                  <li>Billed per second</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SECOND MARQUEE */}
        <div className="marquee-wrap">
          <div className="marquee">
            <span>ALL PAYMENTS VIA X402 PROTOCOL</span><span>&bull;</span>
            <span>NO ACCOUNTS</span><span>&bull;</span>
            <span>NO INVOICES</span><span>&bull;</span>
            <span>USDC ON BASE</span><span>&bull;</span>
            <span>PAY PER USE</span><span>&bull;</span>
            <span>ALL PAYMENTS VIA X402 PROTOCOL</span><span>&bull;</span>
            <span>NO ACCOUNTS</span><span>&bull;</span>
            <span>NO INVOICES</span><span>&bull;</span>
            <span>USDC ON BASE</span><span>&bull;</span>
            <span>PAY PER USE</span><span>&bull;</span>
          </div>
        </div>

        {/* CTA */}
        <section className="cta-section" id="cta">
          <h2>Give Your Agent a Phone Number</h2>
          <p>One API call. Five dollars. Your agent joins the telephone network.</p>
          <Link href="/signup" className="btn-primary">Get Number</Link>
        </section>

        {/* FOOTER */}
        <footer className="footer">
          <span>AGENT[NUMBER] &copy; 2026</span>
          <div className="footer-links">
            <Link href="/docs">Docs</Link>
            <a href="https://github.com/KobeFuckingBryant/agentnumber" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://www.x402.org" target="_blank" rel="noopener noreferrer">x402</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
