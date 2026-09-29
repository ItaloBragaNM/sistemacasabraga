import Image from "next/image";

export function CasaBragaMark({
  compact = false,
  onLight = false,
}: {
  compact?: boolean;
  onLight?: boolean;
}) {
  return (
    <Image
      src={onLight ? "/brand/zoraide-braga-forest.png" : "/brand/zoraide-braga.png"}
      alt="Zoraide Braga"
      width={666}
      height={182}
      priority
      className={compact ? "h-auto w-36" : "h-auto w-[11rem]"}
    />
  );
}
