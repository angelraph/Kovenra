import Link from "next/link";
import { Mark } from "@/components/brand";

export default function NotFound() {
  return (
    <section className="wrap center" style={{ padding: "110px 16px 120px" }}>
      <Mark size={64} />
      <h1 style={{ fontSize: "clamp(40px,7vw,80px)", marginTop: 26 }}>This seat is empty</h1>
      <p className="lead" style={{ margin: "16px auto 0" }}>The page you were looking for isn&apos;t here. It may have moved, or the link might be wrong.</p>
      <div className="row" style={{ justifyContent: "center", marginTop: 28 }}>
        <Link href="/" className="btn">Back home</Link>
        <Link href="/events" className="btn btn-ghost">Find an event</Link>
      </div>
    </section>
  );
}
