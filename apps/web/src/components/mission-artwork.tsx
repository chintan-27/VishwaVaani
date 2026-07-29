import type { MissionSlug } from "@/lib/types";

export function MissionArtwork({
  slug,
  compact = false,
}: {
  slug: MissionSlug;
  compact?: boolean;
}) {
  return (
    <svg
      className={compact ? "mission-artwork compact" : "mission-artwork"}
      viewBox="0 0 520 280"
      role="img"
      aria-label={`${slug.replaceAll("-", " ")} abstract scene`}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${slug}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#26345B" />
          <stop offset="0.58" stopColor="#161F36" />
          <stop offset="1" stopColor="#0D1424" />
        </linearGradient>
        <linearGradient id={`${slug}-glow`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFB15A" stopOpacity=".06" />
          <stop offset=".5" stopColor="#FFB15A" stopOpacity=".58" />
          <stop offset="1" stopColor="#68E0D1" stopOpacity=".05" />
        </linearGradient>
      </defs>
      <rect width="520" height="280" fill={`url(#${slug}-sky)`} />
      <ellipse cx="260" cy="224" rx="250" ry="58" fill={`url(#${slug}-glow)`} />
      <path d="M0 222Q125 194 248 220T520 210V280H0Z" fill="#0C1321" />
      <path d="M0 238Q150 213 270 239T520 228" fill="none" stroke="#6D7DB0" opacity=".2" />

      {slug === "us-immigration" && (
        <>
          <path d="M92 203V105h84v98M106 121h56M106 141h56M106 161h56" fill="none" stroke="#7382AB" strokeWidth="3" />
          <path d="M345 205v-76h104v76M361 149h72M361 169h72" fill="none" stroke="#7382AB" strokeWidth="3" />
          <path d="M216 195h82l-12-28h-57Z" fill="#101A2B" stroke="#FFB15A" strokeWidth="2" />
          <circle cx="257" cy="148" r="18" fill="none" stroke="#8D9CFF" strokeWidth="2" />
          <path d="M254 137v14l9 5" fill="none" stroke="#8D9CFF" strokeWidth="2" />
          <path d="M38 82h192" stroke="#8D9CFF" strokeOpacity=".35" />
        </>
      )}
      {slug === "hotel-check-in" && (
        <>
          <path d="M79 206V96h138v110M98 116h28v25H98zm48 0h28v25h-28zm-48 43h28v25H98zm48 0h28v25h-28z" fill="none" stroke="#719799" strokeWidth="3" />
          <path d="M274 207h172l-20-59H298Z" fill="#101A2B" stroke="#68E0D1" strokeWidth="2" />
          <path d="M307 144v-22h43v22M356 170h45" fill="none" stroke="#8D9CFF" strokeWidth="3" />
          <circle cx="380" cy="104" r="25" fill="none" stroke="#FFB15A" strokeWidth="2" />
          <path d="M380 79v50M355 104h50" stroke="#FFB15A" strokeWidth="2" opacity=".45" />
        </>
      )}
      {slug === "restaurant-ordering" && (
        <>
          <path d="M126 202h255M163 201l18-80h142l18 80" fill="none" stroke="#8C7C78" strokeWidth="4" />
          <path d="M172 147h142" stroke="#FFB15A" strokeWidth="2" />
          <path d="M236 147c0-23 12-39 28-39s28 16 28 39" fill="none" stroke="#FFB15A" strokeWidth="3" />
          <path d="M264 108V94" stroke="#FFB15A" strokeWidth="3" />
          <path d="M112 105c0-14 10-25 22-25s22 11 22 25v37h-44Z" fill="none" stroke="#68E0D1" strokeWidth="3" />
          <path d="M384 116h41v63h-41zM392 128h25M392 139h19" fill="none" stroke="#8D9CFF" strokeWidth="3" />
        </>
      )}
      {slug === "asking-directions" && (
        <>
          <path d="M41 211L173 105l108 84 74-56 128 78" fill="none" stroke="#426270" strokeWidth="4" />
          <path d="M70 211l104-85 104 82M354 211l3-76 57 30 1 46" fill="none" stroke="#69D69F" strokeWidth="3" />
          <path d="M236 92c0-24 18-42 42-42s42 18 42 42c0 30-42 73-42 73s-42-43-42-73Z" fill="#1B2942" stroke="#FFB15A" strokeWidth="3" />
          <circle cx="278" cy="91" r="13" fill="none" stroke="#FFB15A" strokeWidth="3" />
          <path d="M190 211c12-16 25-21 39-14 17 8 27 2 35-14" fill="none" stroke="#8D9CFF" strokeWidth="3" strokeDasharray="7 8" />
        </>
      )}
      {slug === "missing-baggage" && (
        <>
          <path d="M51 205h420" stroke="#5E6C8E" strokeWidth="4" />
          <path d="M68 206c0 17 14 30 31 30s31-13 31-30M384 206c0 17 14 30 31 30s31-13 31-30" fill="none" stroke="#5E6C8E" strokeWidth="3" />
          <rect x="150" y="103" width="113" height="101" rx="10" fill="#111C30" stroke="#FF7D86" strokeWidth="3" />
          <path d="M180 102V82h52v20M180 122v62M232 122v62" fill="none" stroke="#FF7D86" strokeWidth="3" />
          <rect x="302" y="128" width="91" height="76" rx="8" fill="#111C30" stroke="#8D9CFF" strokeWidth="3" />
          <path d="M327 128v-15h40v15" fill="none" stroke="#8D9CFF" strokeWidth="3" />
          <circle cx="407" cy="94" r="26" fill="none" stroke="#FFB15A" strokeWidth="3" />
          <path d="M407 80v17M407 106v2" stroke="#FFB15A" strokeWidth="4" />
        </>
      )}
      <g opacity=".38">
        <circle cx="39" cy="47" r="1.4" fill="#F7F2E8" />
        <circle cx="103" cy="63" r="1" fill="#F7F2E8" />
        <circle cx="463" cy="55" r="1.2" fill="#F7F2E8" />
        <circle cx="418" cy="82" r=".8" fill="#F7F2E8" />
      </g>
    </svg>
  );
}
