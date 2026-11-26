"""Put the demo together: voice, chapter labels, synced subtitles, then transitions between scenes.

Output: video/kovenra-demo.mp4, video/kovenra-demo.srt and video/TRANSCRIPT.md
"""
import json
import pathlib
import re
import subprocess
import textwrap

import imageio_ffmpeg

ROOT = pathlib.Path(__file__).parent
BUILD = ROOT / "build"
FF = imageio_ffmpeg.get_ffmpeg_exe()
VOICE_DELAY = 0.25  # voice starts a beat after the picture
XF = 0.7  # transition length
FONT_B = "C\\:/Windows/Fonts/segoeuib.ttf"
FONT = "C\\:/Windows/Fonts/segoeui.ttf"
TRANSITIONS = ["fadeblack", "smoothleft", "fade", "slideleft", "fade", "smoothleft", "fade", "slideleft", "fade", "smoothleft", "fadeblack"]


def dur_of(path: pathlib.Path) -> float:
    out = subprocess.run([FF, "-hide_banner", "-i", str(path), "-f", "null", "-"], capture_output=True, text=True).stderr
    t = re.findall(r"time=(\d+):(\d+):([\d.]+)", out)[-1]
    return int(t[0]) * 3600 + int(t[1]) * 60 + float(t[2])


def fpath(p: pathlib.Path) -> str:
    return p.resolve().as_posix().replace(":", "\\:")


def sentences(marks):
    """Merge boundary marks into sentences with start/end (seconds, from voice start)."""
    out = []
    for m in marks:
        out.append({"text": m["text"].strip(), "start": m["start"], "end": m["end"]})
    return out


def scene_pass(s, marks, idx):
    clip = BUILD / "clips" / f"{s['id']}.mp4"
    audio = BUILD / "audio" / f"{s['id']}.mp3"
    dur = dur_of(clip)
    txt = BUILD / "txt"
    txt.mkdir(exist_ok=True)
    filters = []
    if s.get("label"):
        lf = txt / f"{s['id']}-label.txt"
        lf.write_text(s["label"].upper(), encoding="utf-8")
        alpha = "if(lt(t,0.5),0,if(lt(t,1.0),(t-0.5)/0.5,if(lt(t,4.6),1,if(lt(t,5.2),(5.2-t)/0.6,0))))"
        filters.append(
            f"drawtext=fontfile='{FONT_B}':textfile='{fpath(lf)}':expansion=none:fontsize=30:fontcolor=0xFDB129:"
            f"box=1:boxcolor=0x0A0A0B@0.82:boxborderw=18:x=72:y=h-282:alpha='{alpha}'"
        )
    subs = []
    if s["kind"] != "card":
        sens = sentences(marks)
        for i, m in enumerate(sens):
            a = m["start"] + VOICE_DELAY
            b = (sens[i + 1]["start"] + VOICE_DELAY - 0.05) if i + 1 < len(sens) else min(dur - 0.2, m["end"] + VOICE_DELAY + 0.6)
            # One line where it fits, two balanced lines otherwise, each with its own snug box.
            lines = textwrap.wrap(m["text"], 74)
            if len(lines) > 1:
                half = len(m["text"]) // 2
                cut = m["text"].rfind(" ", 0, half + 12)
                lines = [m["text"][:cut].strip(), m["text"][cut:].strip()]
            for k, line in enumerate(lines):
                sf = txt / f"{s['id']}-s{i}-{k}.txt"
                sf.write_text(line, encoding="utf-8")
                y = f"h-{70 + (len(lines) - 1 - k) * 62}-text_h"
                filters.append(
                    f"drawtext=fontfile='{FONT}':textfile='{fpath(sf)}':expansion=none:fontsize=36:fontcolor=white:"
                    f"box=1:boxcolor=0x000000@0.66:boxborderw=14:x=(w-text_w)/2:y={y}:enable='between(t,{a:.2f},{b:.2f})'"
                )
            subs.append((a, b, m["text"]))
    vf = ",".join(filters) if filters else "null"
    out = BUILD / "scenes" / f"{s['id']}.mp4"
    out.parent.mkdir(exist_ok=True)
    d_ms = int(VOICE_DELAY * 1000)
    subprocess.run(
        [FF, "-y", "-hide_banner", "-loglevel", "error", "-i", str(clip), "-i", str(audio),
         "-filter_complex", f"[0:v]scale=in_range=pc:out_range=tv,{vf},format=yuv420p[v];[1:a]aresample=48000,adelay={d_ms}|{d_ms},apad,atrim=0:{dur:.3f},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[a]",
         "-map", "[v]", "-map", "[a]", "-t", f"{dur:.3f}", "-r", "30", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-c:a", "aac", "-b:a", "192k", "-ac", "2", str(out)],
        check=True,
    )
    return out, dur, subs


def ts(t):
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}".replace(".", ",")


def main():
    spec = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
    timings = json.loads((BUILD / "audio" / "timings.json").read_text(encoding="utf-8"))
    parts = []
    for i, s in enumerate(spec["scenes"]):
        out, dur, subs = scene_pass(s, timings[s["id"]], i)
        parts.append((s, out, dur, subs))
        print("scene", s["id"], f"{dur:.1f}s")

    # Chain transitions: each xfade starts XF before the previous running length ends.
    inputs, fc = [], []
    for _, out, _, _ in parts:
        inputs += ["-i", str(out)]
    offset = 0.0
    v_prev, a_prev = "0:v", "0:a"
    starts = [0.0]
    for i in range(1, len(parts)):
        offset += parts[i - 1][2] - XF
        starts.append(offset)
        tr = TRANSITIONS[(i - 1) % len(TRANSITIONS)]
        fc.append(f"[{v_prev}][{i}:v]xfade=transition={tr}:duration={XF}:offset={offset:.3f}[v{i}]")
        fc.append(f"[{a_prev}][{i}:a]acrossfade=d={XF}:c1=tri:c2=tri[a{i}]")
        v_prev, a_prev = f"v{i}", f"a{i}"
    total = starts[-1] + parts[-1][2]
    fc.append(f"[{v_prev}]fade=t=in:st=0:d=0.6,fade=t=out:st={total - 0.8:.3f}:d=0.8,format=yuv420p[vout]")
    fc.append(f"[{a_prev}]afade=t=in:st=0:d=0.4,afade=t=out:st={total - 0.9:.3f}:d=0.9[aout]")
    final = ROOT / "kovenra-demo.mp4"
    subprocess.run(
        [FF, "-y", "-hide_banner", "-loglevel", "error", *inputs, "-filter_complex", ";".join(fc), "-map", "[vout]", "-map", "[aout]",
         "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
         "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", str(final)],
        check=True,
    )

    # Subtitles and transcript.
    srt, md, n = [], ["# Kovenra demo: transcript", ""], 1
    for (s, _, _, subs), st in zip(parts, starts):
        md.append(f"**{s['label'] or ('Intro' if s['id'].endswith('intro') else 'Outro')}** ({ts(st)[3:8]})  ")
        md.append(s["say"])
        md.append("")
        for a, b, t in subs:
            srt.append(f"{n}\n{ts(st + a)} --> {ts(st + b)}\n{t}\n")
            n += 1
    (ROOT / "kovenra-demo.srt").write_text("\n".join(srt), encoding="utf-8")
    (ROOT / "TRANSCRIPT.md").write_text("\n".join(md), encoding="utf-8")
    print(f"done: {final.name} ({total:.1f}s)")


main()
