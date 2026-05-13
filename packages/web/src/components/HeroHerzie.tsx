"use client";

import { Herzie3D, Sky } from "@herzies/shared";
import { useEffect, useRef, useState } from "react";

const SEEDS = [
  "hero-mochi",
  "hero-pippin",
  "hero-juno",
  "hero-luma",
  "hero-fern",
  "hero-bento",
  "hero-tofu",
  "hero-ziggy",
];

const SIZE = 8;

interface Props {
  stage?: number;
}

export function HeroHerzie({ stage = 2 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [seed, setSeed] = useState(SEEDS[0]);
  const [cols, setCols] = useState(120);

  useEffect(() => {
    setSeed(SEEDS[Math.floor(Math.random() * SEEDS.length)]);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const charW = SIZE * 0.6;
      setCols(Math.max(20, Math.floor(el.clientWidth / charW)));
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section
      ref={containerRef}
      aria-label="Herzies preview"
      className="relative w-full overflow-hidden"
      // style={{ minHeight: "min(60vh, 540px)" }}
    >
      {/* <Sky
				userId={seed}
				cols={cols}
				size={SIZE}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					zIndex: 0,
				}}
			/> */}
      <div className="relative z-10 flex flex-col items-center">
        <Herzie3D
          userId={seed}
          stage={stage}
          size={SIZE}
          ariaLabel={`A stage ${stage} herzie`}
        />
      </div>
    </section>
  );
}
