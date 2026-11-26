import Link from "next/link";
import Bento from "@/components/home/Bento";
import AgentDemo from "@/components/home/AgentDemo";
import AppWindow from "@/components/home/AppWindow";
import AskBox from "@/components/home/AskBox";
import { Slot } from "@/components/home/HeadlineSlots";
import HeroStage from "@/components/home/HeroStage";
import LiveBoard from "@/components/home/LiveBoard";
import Promise from "@/components/home/Promise";
import { FaqItems } from "@/components/FaqList";
import { Arrow } from "@/components/icons";
import { Marquee, Reveal, Story, WordsUp } from "@/components/motion";
import { Scene, SCENES } from "@/components/Scene";
import { FAQS } from "@/lib/faq";

const BUILT_ON = [
  ["Celo", "mainnet"], ["Self", "agent id"], ["Textile", "fx"], ["x402", "payments"], ["cNGN", "naira"],
  ["USD₮", "tether"], ["MiniPay", "wallet"], ["ERC-8004", "identity"], ["ERC-8021", "attribution"],
];

const SCENE_CTRLS: { label: string; value: string; pct?: number; toggle?: boolean }[] = [
  { label: "Price", value: "₦15,000", pct: 62 },
  { label: "Per person", value: "1 ticket", pct: 10 },
  { label: "Verified humans only", value: "", toggle: true },
  { label: "Seats", value: "300", pct: 40 },
  { label: "18+ check", value: "", toggle: true },
  { label: "Price", value: "₦3,000", pct: 22 },
  { label: "Per person", value: "2 tickets", pct: 25 },
  { label: "Seats", value: "1,200", pct: 80 },
];

const TOKENS_L = [["₦", "#1f9d55"], ["₮", "#26a17b"], ["✓", "#7c5cff"], ["QR", "#27272a"], ["₦", "#0f5132"], ["18+", "#be123c"]];
const TOKENS_R = [["K", "#fdb129"], ["402", "#27272a"], ["₦", "#1f9d55"], ["✓", "#059669"], ["₮", "#137a5a"], ["cNGN", "#14532d"]];

export default function Home() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-glow" aria-hidden />
        <div className="wrap">
          <Reveal><span className="eyebrow">Fair ticketing for Nigeria · on Celo</span></Reveal>
          <h1 style={{ marginTop: 20 }}>
            <WordsUp text="Fair tickets" /> <Slot set={0} delay={0} /> <WordsUp text="for real people." delay={0.12} /> <Slot set={1} delay={0.15} />
            <br className="hide-sm" /> <WordsUp text="Paid in naira" delay={0.3} /> <Slot set={2} delay={0.3} />
          </h1>
          <Reveal delay={0.35}>
            <p className="lead hero-sub">
              Kovenra sells one ticket per verified person, so bots and touts can&apos;t empty your show before the fans get there. Fans pay in dollars or
              naira from their phone. Organizers get naira in seconds.
            </p>
          </Reveal>
          <Reveal delay={0.45}>
            <div className="hero-ctas">
              <Link href="/new" className="btn btn-lg">List your event, free</Link>
              <Link href="/events" className="btn btn-ghost btn-lg">Find an event</Link>
            </div>
          </Reveal>
          <Reveal delay={0.55}>
            <div className="hero-meta">
              <span className="works"><b>Works with</b> MiniPay · Valora · MetaMask · any AI agent with Self Agent ID</span>
              <Link href="/how-it-works#fair-drop" className="newlink"><b>New:</b> Fair Drop draws and face-value resale →</Link>
            </div>
          </Reveal>
          <Reveal delay={0.2} y={40}>
            <HeroStage />
          </Reveal>
        </div>
      </section>

      {/* ── Built on ── */}
      <section className="wrap" aria-label="Built on">
        <Marquee duration={40}>
          {BUILT_ON.map(([n, s]) => <span key={n} className="wordmark">{n}<small>{s}</small></span>)}
        </Marquee>
      </section>

      {/* ── Problem ── */}
      <section className="section">
        <div className="wrap">
          <Reveal><p className="twotone">Shows sell out in minutes. <span>Then the same tickets turn up on WhatsApp and X at three times the price.</span></p></Reveal>
          <div style={{ marginTop: 70 }}>
            <Story
              lines={[
                <>Every promoter knows the feeling. <em>Sold out at 9:02.</em> Half the room bought from a tout.</>,
                <>Fake accounts and bots don&apos;t come to the show. <em>They come to resell it.</em></>,
                <>Kovenra checks that every buyer is <em>one real, unique person</em>, and pays the organizer in naira the moment they buy.</>,
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── Live board ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <Reveal><span className="eyebrow">Live, right now</span><h2 style={{ marginTop: 14 }}>Real numbers,<br />not a demo</h2></Reveal>
            <Reveal delay={0.1}><p className="muted" style={{ maxWidth: 420 }}>Everything on this board comes straight from Celo mainnet, Textile FX and Kovenra&apos;s own records. Nothing is made up.</p></Reveal>
          </div>
          <Reveal><LiveBoard /></Reveal>
        </div>
      </section>

      {/* ── Bento ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="center" style={{ marginBottom: 40 }}>
            <Reveal><span className="eyebrow">Why it&apos;s fair</span></Reveal>
            <Reveal delay={0.05}><h2 style={{ marginTop: 14 }}>One promise,<br />six ways we keep it</h2></Reveal>
          </div>
          <Bento />
        </div>
      </section>

      {/* ── Organizer view ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <Reveal><p className="twotone" style={{ maxWidth: 760 }}>Your whole event on one screen. <span>Sales, naira received, bots blocked and the door, live from your phone.</span></p></Reveal>
            <Reveal delay={0.1}><Link href="/organizers" className="link-arrow">For organizers <Arrow size={16} /></Link></Reveal>
          </div>
          <Reveal y={30}><AppWindow /></Reveal>
        </div>
      </section>

      {/* ── Every kind of night ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <Reveal><span className="eyebrow">Made for every kind of night</span><h2 style={{ marginTop: 14 }}>From campus halls<br />to stadium stages</h2></Reveal>
            <Reveal delay={0.1}><p className="muted" style={{ maxWidth: 400 }}>Set your own price, seats and rules. Abuja, Enugu, Kano, Port Harcourt, Ibadan, Lagos or a small town hall: it all works the same.</p></Reveal>
          </div>
          <div className="scenes">
            {SCENES.map((s, i) => {
              const c = SCENE_CTRLS[i];
              return (
                <Reveal key={s.kind} delay={(i % 4) * 0.06}>
                  <div className="scene">
                    <Scene kind={s.kind} seed={1} className="art" w={600} />
                    <div className="scene-name"><span>{s.city}</span>{s.title}</div>
                    <div className="scene-ctrl">
                      {c.toggle ? (
                        <div className="toggle-ui"><span>{c.label}</span><span className="switch" /></div>
                      ) : (
                        <>
                          <div className="lbl"><span>{c.label}</span><b>{c.value}</b></div>
                          <div className="track"><span style={{ width: `${c.pct}%` }} /><i style={{ left: `${c.pct}%` }} /></div>
                        </>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Agents ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap agent-wrap">
          <div style={{ position: "sticky", top: 100 }}>
            <Reveal><span className="eyebrow">For AI agents</span></Reveal>
            <Reveal delay={0.05}><h2 style={{ marginTop: 14 }}>Let your agent queue for you</h2></Reveal>
            <Reveal delay={0.1}>
              <p className="lead" style={{ marginTop: 18 }}>
                Tell your agent &quot;get me a ticket when it drops&quot;. Kovenra serves agents that carry a Self Agent ID linking them to a real person, and takes payment over x402.
              </p>
              <p className="muted" style={{ marginTop: 14 }}>All of one person&apos;s agents share one limit, so nobody can run a hundred bots to clear a show.</p>
              <div className="row" style={{ marginTop: 24 }}>
                <Link href="/agents" className="btn">Read the agent guide</Link>
                <a href="/skill.md" className="btn btn-ghost">skill.md</a>
              </div>
            </Reveal>
          </div>
          <Reveal y={30}><AgentDemo /></Reveal>
        </div>
      </section>

      {/* ── Promise ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap"><Reveal><Promise /></Reveal></div>
      </section>

      {/* ── Naira ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal>
            <div className="floaty">
              <div className="floaty-col l" aria-hidden><div className="floaty-track">{[...TOKENS_L, ...TOKENS_L].map(([t, c], i) => <div key={i} className="token" style={{ background: c, fontSize: t.length > 2 ? 16 : 26 }}>{t}</div>)}</div></div>
              <div className="floaty-col r" aria-hidden><div className="floaty-track">{[...TOKENS_R, ...TOKENS_R].map(([t, c], i) => <div key={i} className="token" style={{ background: c, color: c === "#fdb129" ? "#1a1203" : "#fff", fontSize: t.length > 2 ? 16 : 26 }}>{t}</div>)}</div></div>
              <p className="twotone" style={{ margin: "0 auto", maxWidth: 620 }}><span>Paid in dollars?</span> Received in naira.</p>
              <p className="muted" style={{ margin: "18px auto 0", maxWidth: 520 }}>
                Fans at home and abroad pay in USD₮ or cNGN. You always receive cNGN, the official naira stablecoin, ready to spend or cash out to any Nigerian bank.
              </p>
              <div className="row" style={{ justifyContent: "center", marginTop: 26 }}>
                <Link href="/pricing" className="btn btn-ghost">See pricing</Link>
                <Link href="/how-it-works#naira" className="btn btn-ghost">How naira payouts work</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ teaser ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap faq">
          <div className="faq-head">
            <Reveal><h2>Questions,<br />answered</h2></Reveal>
            <Reveal delay={0.05}><p className="muted" style={{ marginTop: 14, maxWidth: 360 }}>The short version of what people ask us most. There&apos;s a lot more on the FAQ page.</p></Reveal>
            <Reveal delay={0.1}><Link href="/faq" className="link-arrow" style={{ marginTop: 22 }}>See all questions <Arrow size={16} /></Link></Reveal>
          </div>
          <Reveal><FaqItems items={FAQS.filter((f) => f.top)} /></Reveal>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="section final" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal><h2>Your next show<br /><span className="goldtext">starts here</span></h2></Reveal>
          <Reveal delay={0.1}><AskBox /></Reveal>
          <Reveal delay={0.15}><Link href="/events" className="small faint" style={{ display: "inline-block", marginTop: 22 }}>Or browse events as a fan →</Link></Reveal>
          <Reveal delay={0.1}><Link href="/new" className="bigbar">List your event <Arrow size={44} /></Link></Reveal>
        </div>
      </section>
    </>
  );
}
