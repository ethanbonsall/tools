
import { useMemo } from "react";

type CircularTextProps = {
  text: string;
  radius?: number;
  className?: string;
};

export default function CircularText({
  text,
  radius = 140,
  className = "",
}: CircularTextProps) {
  const chars = useMemo(() => {
    const padded = `${text.trim()} • ${text.trim()} • `;
    return padded.split("");
  }, [text]);

  const deg = 360 / chars.length;

  return (
    <div
      className={`relative ${className}`}
      style={{ width: radius * 2, height: radius * 2 }}
      aria-label={text}
    >
      <div className="absolute inset-0 animate-[spin_28s_linear_infinite]">
        {chars.map((char, i) => (
          <span
            key={`${char}-${i}`}
            className="absolute left-1/2 top-1/2 origin-[0_0] font-display text-sm font-semibold uppercase tracking-[0.2em] text-ink/80 sm:text-base"
            style={{
              transform: `rotate(${i * deg}deg) translateY(-${radius}px)`,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </div>
      <div className="absolute inset-[28%] flex items-center justify-center rounded-full border border-mint/40 bg-paper/80 shadow-[0_0_60px_rgba(45,212,168,0.18)]">
        <span className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          ET
        </span>
      </div>
    </div>
  );
}
