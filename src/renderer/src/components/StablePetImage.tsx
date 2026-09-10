import { useState } from "react";
import type { JSX } from "react";

export function StablePetImage({ src, alt }: { src: string; alt: string }): JSX.Element {
  const [displayed, setDisplayed] = useState<string | null>(null);
  const sources = [...new Set(displayed ? [displayed, src] : [src])];
  return <>{sources.map((source) => (
    <img
      key={source}
      draggable={false}
      src={source}
      alt={source === displayed ? alt : ""}
      aria-hidden={source !== displayed}
      style={{ position: "absolute", visibility: source === displayed ? "visible" : "hidden" }}
      onLoad={() => { if (source === src) setDisplayed(source); }}
      onError={() => console.warn("Fufu could not load a pet animation; keeping the previous image.")}
    />
  ))}</>;
}
