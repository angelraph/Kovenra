"""Voiceover for every scene, with sentence timings for captions. Uses Microsoft's neural voices via edge-tts."""
import asyncio
import json
import pathlib

import edge_tts

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "build" / "audio"


async def scene(voice: str, rate: str, sid: str, text: str):
    comm = edge_tts.Communicate(text, voice, rate=rate, boundary="SentenceBoundary")
    audio = bytearray()
    marks = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] in ("SentenceBoundary", "WordBoundary"):
            marks.append({"text": chunk["text"], "start": chunk["offset"] / 1e7, "end": (chunk["offset"] + chunk["duration"]) / 1e7})
    (OUT / f"{sid}.mp3").write_bytes(bytes(audio))
    return marks


async def main():
    spec = json.loads((ROOT / "script.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    timings = {}
    for s in spec["scenes"]:
        timings[s["id"]] = await scene(spec["voice"], spec["rate"], s["id"], s["say"])
        print(s["id"], len(timings[s["id"]]), "sentences")
    (OUT / "timings.json").write_text(json.dumps(timings, indent=2), encoding="utf-8")


asyncio.run(main())
