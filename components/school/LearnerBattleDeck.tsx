"use client";

import type { InspectorLearnerDetail } from "../../lib/schools/inspector-directory";
import styles from "./SchoolMap.module.scss";

function Gauge({
  title,
  value,
  arc,
  caption,
  tone,
}: {
  title: string;
  value: string;
  arc: number;
  caption?: string;
  tone: "confidence" | "resilience";
}) {
  return (
    <section className={styles["school-map__card"]} aria-label={title}>
      <h4>{title}</h4>
      <div className={`${styles["school-map__gauge"]} ${styles[`school-map__gauge--${tone}`]}`} role="img" aria-label={`${title}: ${value}`}>
        <svg viewBox="0 0 176 108" aria-hidden="true">
          <path className={styles["school-map__gauge-track"]} d="M14 88a74 74 0 0 1 148 0" />
          <path
            className={styles["school-map__gauge-fill"]}
            pathLength="100"
            strokeDasharray={`${arc} 100`}
            d="M14 88a74 74 0 0 1 148 0"
          />
        </svg>
        <span>{value}</span>
      </div>
      {caption ? <p className={styles["school-map__caption"]}>{caption}</p> : null}
    </section>
  );
}

export function LearnerBattleDeck({
  initials,
  detail,
  onClose,
}: {
  initials: string;
  detail: InspectorLearnerDetail;
  onClose: () => void;
}) {
  return (
    <div className={styles["school-map__deck-scrim"]} role="presentation" onClick={onClose}>
      <section
        className={styles["school-map__deck"]}
        role="dialog"
        aria-modal="true"
        aria-label={`${initials} Battle Deck`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles["school-map__deck-head"]}>
          <span className={styles["school-map__avatar"]} aria-hidden="true">
            {initials}
          </span>
          <h3>Battle Deck</h3>
          <button type="button" className={styles["school-map__close"]} onClick={onClose}>
            {detail.close || "Close"}
          </button>
        </header>
        {detail.linked ? (
          <>
            <div className={styles["school-map__deck-split"]}>
              <section className={styles["school-map__card"]}>
                <h4>{detail.masteryTitle}</h4>
                {detail.hasHeatmap ? (
                  <div className={styles["school-map__heat-scroll"]}>
                    <table className={styles["school-map__heat"]}>
                      <thead>
                        <tr>
                          <th />
                          {detail.heatLevels.map((level) => (
                            <th key={level}>{level}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.heatRows.map((row) => (
                          <tr key={row.label}>
                            <th>{row.label}</th>
                            {row.cells.map((cell, index) => (
                              <td key={`${row.label}-${index}`}>
                                <span
                                  className={`${styles["school-map__cell"]} ${styles[`school-map__cell--${cell.band}`] ?? ""}`}
                                  role="img"
                                  aria-label={cell.label}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className={styles["school-map__prompt"]}>{detail.heatEmpty}</p>
                )}
              </section>
              {detail.hasConfidence ? (
                <Gauge
                  title={detail.confidenceTitle}
                  value={`${detail.confidence}%`}
                  arc={detail.confidenceArc}
                  caption={detail.confidenceCaption}
                  tone="confidence"
                />
              ) : (
                <section className={styles["school-map__card"]}>
                  <h4>{detail.confidenceTitle}</h4>
                  <p className={styles["school-map__prompt"]}>{detail.confidenceEmpty}</p>
                </section>
              )}
            </div>
            <section>
              <h4 className={styles["school-map__deck-label"]}>{detail.streakTitle}</h4>
              <p className={styles["school-map__streaks"]}>
                <strong>{detail.activeStreak}</strong> {detail.activeLabel}
                {" · "}
                <strong>{detail.bestStreak}</strong> {detail.bestLabel}
              </p>
            </section>
            <section>
              <h4 className={styles["school-map__deck-label"]}>{detail.solvingTitle}</h4>
              {detail.hasProblems ? (
                <ol className={styles["school-map__pills"]}>
                  {detail.problems.map((problem) => (
                    <li key={problem.level} className={styles[`school-map__pill--${problem.state}`] ?? ""}>
                      <strong>{problem.level}</strong>
                      <small>{problem.status}</small>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles["school-map__prompt"]}>{detail.problemEmpty}</p>
              )}
            </section>
            <div className={styles["school-map__deck-split"]}>
              {detail.hasResilience ? (
                <Gauge
                  title={detail.resilienceTitle}
                  value={detail.resilience}
                  arc={detail.resilienceArc}
                  tone="resilience"
                />
              ) : (
                <section className={styles["school-map__card"]}>
                  <h4>{detail.resilienceTitle}</h4>
                  <p className={styles["school-map__prompt"]}>{detail.resilienceEmpty}</p>
                </section>
              )}
              <section className={styles["school-map__card"]}>
                <h4>{detail.strategyTitle}</h4>
                {detail.hasStrategy ? (
                  <p>
                    <strong>{detail.strategy}%</strong> {detail.strategyCaption}
                  </p>
                ) : (
                  <p className={styles["school-map__prompt"]}>{detail.strategyEmpty}</p>
                )}
              </section>
            </div>
          </>
        ) : (
          <p className={styles["school-map__prompt"]}>{detail.unlinkedText || "Nothing to show yet."}</p>
        )}
      </section>
    </div>
  );
}
