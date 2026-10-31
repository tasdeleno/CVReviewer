import type { Analysis } from "lib/job-match";
import type { Importance } from "lib/job-match/keywords";
import { cx } from "lib/cx";

const IMPORTANCE_ROWS: [Importance, string][] = [
  ["required", "Zorunlu"],
  ["normal", "İstenen"],
  ["preferred", "Tercih sebebi"],
];

/**
 * The only place the score is rendered, and never without its `insufficient` flag:
 * with too few skills in the ad the number is noise (eval/README.md, tur 3).
 */
export const ScoreCard = ({ result }: { result: Analysis | null }) => {
  if (!result) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-56 w-56 items-center justify-center rounded-full border-4 border-dashed border-white/40">
          <span className="text-6xl font-bold text-white/40" aria-hidden="true">
            –
          </span>
        </div>
        <p className="text-sm text-white/75">
          İlanı ve CV'ni ekle, uyum skoru burada görünür.
        </p>
      </div>
    );
  }

  const { score, insufficient, langs, matches, ats } = result;
  const skills = matches.filter((m) => m.kind !== "phrase");
  const atsOk = ats.filter((check) => check.ok).length;
  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className={cx(
          "flex h-56 w-56 flex-col items-center justify-center rounded-full",
          insufficient
            ? "border-4 border-dashed border-sign text-white"
            : "bg-sign text-ink"
        )}
      >
        <span className="text-[6.5rem] font-bold tabular-nums leading-none tracking-[-0.04em]">
          {score}
        </span>
        <span className="text-sm font-bold">uyum / 100</span>
      </div>
      {insufficient && (
        <p className="w-full bg-sign px-3 py-2 text-sm font-bold text-ink">
          Az sinyal: ilanda üçten az beceri bulundu. Bu skor yol gösterici
          değil.
        </p>
      )}
      <dl className="w-full text-sm tabular-nums">
        {IMPORTANCE_ROWS.map(([importance, label]) => {
          const all = skills.filter((m) => m.importance === importance);
          if (!all.length) return null;
          return (
            <div
              key={importance}
              className="flex justify-between border-t border-white/20 py-2"
            >
              <dt>{label}</dt>
              <dd className="font-bold text-sign">
                {all.filter((m) => m.found).length} / {all.length}
              </dd>
            </div>
          );
        })}
        <div className="flex justify-between border-t border-white/20 py-2">
          <dt>ATS kontrolleri</dt>
          <dd className="font-bold text-sign">
            {atsOk} / {ats.length}
          </dd>
        </div>
        <div className="flex justify-between border-t border-white/20 py-2">
          <dt>Dil</dt>
          <dd className="font-bold">
            İlan {langs.ad.toUpperCase()} · CV {langs.resume.toUpperCase()}
          </dd>
        </div>
      </dl>
      {langs.ad !== langs.resume && (
        <p className="w-full border-2 border-sign px-3 py-2 text-sm">
          İlan ve CV farklı dilde. Eşleşme düşük çıkar: ilanın dilindeki CV'ni
          yükle.
        </p>
      )}
    </div>
  );
};
