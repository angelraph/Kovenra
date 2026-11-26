"""Record every scene as sharp 1080p frames (Chrome screencast), driven by the actions in script.json.

Usage: python record.py <base-url> [scene-id ...]
"""
import base64
import json
import pathlib
import re
import subprocess
import sys
import time

import imageio_ffmpeg
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).parent
BUILD = ROOT / "build"
FF = imageio_ffmpeg.get_ffmpeg_exe()
W, H = 1920, 1080
TAIL = 1.0  # seconds of picture after the voice ends

SMOOTH = """
window.__smooth = (y, ms) => new Promise(r => {
  const s = scrollY, d = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight)) - s, t0 = performance.now();
  const ease = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
  const f = n => { const p = Math.min(1, (n - t0) / ms); scrollTo(0, s + d * ease(p)); p < 1 ? requestAnimationFrame(f) : r(); };
  requestAnimationFrame(f);
});
"""

CURSOR = """
(() => {
  if (document.getElementById('__cur')) return;
  const st = document.createElement('style');
  st.textContent = `::-webkit-scrollbar{display:none} html{scrollbar-width:none}
  #__cur{position:fixed;left:0;top:0;width:26px;height:26px;margin:-4px 0 0 -4px;z-index:2147483647;pointer-events:none;transition:transform .08s linear}
  #__cur svg{filter:drop-shadow(0 4px 10px rgba(0,0,0,.6))}
  #__ring{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border:3px solid #fdb129;border-radius:50%;z-index:2147483646;pointer-events:none;opacity:0;transform:scale(.4)}
  #__ring.on{animation:__r .5s ease-out}
  @keyframes __r{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(1.6)}}`;
  document.head.appendChild(st);
  const c = document.createElement('div'); c.id='__cur';
  c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 3l7 18 2.5-7.5L21 11z" fill="#fdb129" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  const ring = document.createElement('div'); ring.id='__ring';
  document.body.append(c, ring);
  c.style.left = (innerWidth*0.72)+'px'; c.style.top = (innerHeight*0.6)+'px';
  addEventListener('mousemove', e => { c.style.left = e.clientX+'px'; c.style.top = e.clientY+'px'; }, true);
  addEventListener('mousedown', e => { ring.style.left = e.clientX+'px'; ring.style.top = e.clientY+'px'; ring.classList.remove('on'); void ring.offsetWidth; ring.classList.add('on'); }, true);
})();
"""


def audio_len(sid: str) -> float:
    out = subprocess.run([FF, "-hide_banner", "-i", str(BUILD / "audio" / f"{sid}.mp3"), "-f", "null", "-"], capture_output=True, text=True).stderr
    t = re.findall(r"time=(\d+):(\d+):([\d.]+)", out)[-1]
    return int(t[0]) * 3600 + int(t[1]) * 60 + float(t[2])


def move_to(page, sel, secs=0.9):
    box = page.locator(sel).first.bounding_box()
    if not box:
        return None
    x, y = box["x"] + box["width"] / 2, box["y"] + box["height"] / 2
    page.mouse.move(x, y, steps=max(8, int(secs * 40)))
    return x, y


def run_actions(page, actions):
    for a in actions:
        kind = a[0]
        if kind == "wait":
            page.wait_for_timeout(int(a[1] * 1000))
        elif kind == "scroll":
            page.evaluate("([d, ms]) => window.__smooth(scrollY + d, ms)", [a[1], int(a[2] * 1000)])
        elif kind == "scrollTo":
            page.evaluate(
                "([sel, ms]) => { const el = document.querySelector(sel); if (!el) return; return window.__smooth(el.getBoundingClientRect().top + scrollY - 96, ms); }",
                [a[1] if a[1].startswith((".", "#", "[")) else "." + a[1], int(a[2] * 1000)],
            )
        elif kind == "hover":
            move_to(page, a[1])
        elif kind == "click":
            if move_to(page, a[1]):
                page.wait_for_timeout(250)
                page.mouse.down()
                page.mouse.up()
        elif kind == "type":
            if move_to(page, a[1], 0.7):
                page.mouse.down()
                page.mouse.up()
                page.keyboard.type(a[2], delay=55)
                page.wait_for_timeout(250)


def record_scene(pw, base: str, s: dict, slugs: dict):
    dur = audio_len(s["id"]) + TAIL
    frames_dir = BUILD / "frames" / s["id"]
    frames_dir.mkdir(parents=True, exist_ok=True)
    for f in frames_dir.glob("*"):
        f.unlink()
    browser = pw.chromium.launch(args=["--hide-scrollbars", "--force-color-profile=srgb"])
    # A 1440x810 layout rendered at 4/3 scale: text reads larger, and frames are still a sharp 1920x1080.
    ctx = (
        browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=1, color_scheme="dark")
        if s["kind"] == "card"
        else browser.new_context(viewport={"width": 1440, "height": 810}, device_scale_factor=W / 1440, color_scheme="dark")
    )
    page = ctx.new_page()
    if s["kind"] == "card":
        url = (ROOT / "cards" / "card.html").resolve().as_uri() + f"?kind={s['card']}"
    else:
        url = base + s["path"].replace("{drop}", slugs["drop"])
    # Load everything before we start capturing, so the clip starts on a finished page.
    if s["kind"] == "card":
        page.goto("about:blank")
    else:
        page.goto(url, wait_until="networkidle", timeout=90_000)
        page.wait_for_timeout(1500)
        page.evaluate("window.scrollTo(0,0)")
    cdp = ctx.new_cdp_session(page)
    frames = []

    def on_frame(ev):
        frames.append((ev["metadata"]["timestamp"], ev["data"]))
        try:
            cdp.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})
        except Exception:
            pass

    cdp.on("Page.screencastFrame", on_frame)
    cdp.send("Page.startScreencast", {"format": "jpeg", "quality": 92, "maxWidth": W, "maxHeight": H, "everyNthFrame": 1})
    if s["kind"] == "card":
        page.goto(url, wait_until="load")
        page.wait_for_timeout(300)
    page.evaluate(SMOOTH)
    if s["kind"] != "card":
        page.evaluate(CURSOR)
    t0 = time.time()
    run_actions(page, s.get("actions", []))
    left = dur - (time.time() - t0)
    if left > 0:
        page.wait_for_timeout(int(left * 1000))
    # Nudge one last frame so the final still is captured.
    page.evaluate("document.body.style.outline='0px solid transparent'")
    page.wait_for_timeout(120)
    cdp.send("Page.stopScreencast")
    ctx.close()
    browser.close()

    # Frames with timestamps -> constant 30 fps clip of exactly `dur` seconds.
    frames = [f for f in frames if f[0] >= t0 - 0.05] or frames[-1:]
    lines = []
    for i, (ts, data) in enumerate(frames):
        p = frames_dir / f"{i:05d}.jpg"
        p.write_bytes(base64.b64decode(data))
        nxt = frames[i + 1][0] if i + 1 < len(frames) else t0 + dur
        lines.append(f"file '{p.as_posix()}'\nduration {max(0.001, nxt - max(ts, t0)):.4f}")
    lines.append(f"file '{(frames_dir / f'{len(frames) - 1:05d}.jpg').as_posix()}'")
    (frames_dir / "list.txt").write_text("\n".join(lines), encoding="utf-8")
    out = BUILD / "clips" / f"{s['id']}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [FF, "-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(frames_dir / "list.txt"),
         "-vf", f"fps=30,scale={W}:{H}:flags=lanczos,format=yuv420p", "-t", f"{dur:.3f}", "-c:v", "libx264", "-preset", "slow", "-crf", "16", str(out)],
        check=True,
    )
    print(f"{s['id']}: {len(frames)} frames, {dur:.1f}s -> {out.name}")


def main():
    base = sys.argv[1].rstrip("/")
    only = set(sys.argv[2:])
    spec = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
    slugs_list = [x for x in (BUILD / "slugs.txt").read_text().split() if x]
    slugs = {"drop": slugs_list[0]}
    with sync_playwright() as pw:
        for s in spec["scenes"]:
            if only and s["id"] not in only:
                continue
            record_scene(pw, base, s, slugs)


main()
