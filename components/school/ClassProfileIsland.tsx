"use client";

import type { InspectorGradeProfile, InspectorLearnerRow } from "../../lib/schools/inspector-directory";
import { CountUp, useHudReady } from "./hud-motion";
import styles from "./SchoolMap.module.scss";

function HeatTable({
  levels,
  rows,
}: {
  levels: number[];
  rows: InspectorGradeProfile["heatRows"];
}) {
  return (
    <div className={styles["school-map__heat-scroll"]}>
      <table className={styles["school-map__heat"]}>
        <thead>
          <tr>
            <th />
            {levels.map((level) => (
              <th key={level}>{level}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
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
  );
}

export function ClassProfileIsland({
  profile,
  loading,
  failed,
  onClose,
  onSelectLearner,
}: {
  profile: InspectorGradeProfile | null;
  loading: boolean;
  failed: boolean;
  onClose: () => void;
  onSelectLearner: (learnerKey: string) => void;
}) {
  const ready = useHudReady(Boolean(profile) && !loading, 280);
  return (
    <aside className={styles["school-map__class"]} aria-label={profile?.label ?? "Class profile"}>
      <div className={styles["school-map__class-head"]}>
        <h3>{profile?.label ?? "Class"}</h3>
        <button type="button" className={styles["school-map__close"]} onClick={onClose}>
          Close
        </button>
      </div>
      {loading ? <p className={styles["school-map__prompt"]}>Loading class…</p> : null}
      {failed ? <p className={styles["school-map__prompt"]}>Class profile unavailable.</p> : null}
      {profile && !loading ? (
        <>
          <div className={styles["school-map__class-split"]}>
            <section className={styles["school-map__card"]}>
              <div className={styles["school-map__card-head"]}>
                <h4>{profile.progressTitle}</h4>
                <span>{profile.accuracyHeading}</span>
              </div>
              {profile.progress.length === 0 ? (
                <p className={styles["school-map__prompt"]}>Nothing to show yet.</p>
              ) : (
                <ol className={styles["school-map__progress"]}>
                  {profile.progress.map((learner, index) => (
                    <LearnerProgress
                      key={learner.learnerKey}
                      learner={learner}
                      index={index}
                      ready={ready}
                      onSelect={onSelectLearner}
                    />
                  ))}
                </ol>
              )}
            </section>
            <section className={styles["school-map__card"]}>
              <h4>{profile.heatTitle}</h4>
              {profile.hasHeatmap ? (
                <HeatTable levels={profile.heatLevels} rows={profile.heatRows} />
              ) : (
                <p className={styles["school-map__prompt"]}>{profile.heatEmpty || "Nothing to show yet."}</p>
              )}
            </section>
          </div>
          <div className={styles["school-map__class-trio"]}>
            <section className={styles["school-map__card"]}>
              <h4>{profile.assignmentsTitle}</h4>
              {profile.hasAssignments ? (
                <ul className={styles["school-map__counts"]}>
                  <li>
                    <strong><CountUp value={profile.assignmentsCompleted} ready={ready} delay={80} /></strong>
                    <span>{profile.assignmentsCompletedLabel}</span>
                  </li>
                  <li>
                    <strong><CountUp value={profile.assignmentsOverdue} ready={ready} delay={140} /></strong>
                    <span>{profile.assignmentsOverdueLabel}</span>
                  </li>
                  <li>
                    <strong><CountUp value={profile.assignmentsTotal} ready={ready} delay={200} /></strong>
                    <span>{profile.assignmentsTotalLabel}</span>
                  </li>
                </ul>
              ) : (
                <p className={styles["school-map__prompt"]}>{profile.assignmentsEmpty}</p>
              )}
            </section>
            <section className={styles["school-map__card"]}>
              <h4>{profile.challengeTitle}</h4>
              {profile.hasChallenge ? (
                <div className={styles["school-map__challenge"]}>
                  <div className={styles["school-map__donut-wrap"]}>
                    <svg className={styles["school-map__donut"]} viewBox="0 0 42 42" aria-hidden="true">
                      {profile.segments.map((segment, index) => (
                        <circle
                          key={segment.state}
                          className={styles[`school-map__seg--${segment.state}`] ?? ""}
                          cx="21"
                          cy="21"
                          r="15.5"
                          pathLength="100"
                          strokeDasharray={ready ? `${segment.dash} ${segment.gap}` : `0 ${segment.dash + segment.gap}`}
                          strokeDashoffset={segment.offset}
                          style={{ transitionDelay: `${180 + index * 90}ms` }}
                        />
                      ))}
                    </svg>
                    <p>
                      <strong><CountUp value={profile.completionRate ? `${profile.completionRate}%` : "0%"} ready={ready} delay={180} /></strong>
                      <span>{profile.completionLabel}</span>
                    </p>
                  </div>
                  <ul className={styles["school-map__legend"]}>
                    {profile.segments.map((segment, index) => (
                      <li key={segment.state} className={styles[`school-map__legend--${segment.state}`] ?? ""}>
                        <span />
                        {segment.label} <strong><CountUp value={segment.count} ready={ready} delay={180 + index * 90} /></strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className={styles["school-map__prompt"]}>{profile.assignmentsEmpty}</p>
              )}
            </section>
            <section className={styles["school-map__card"]}>
              <h4>{profile.spotlightTitle}</h4>
              {profile.spotlight ? (
                <button
                  type="button"
                  className={styles["school-map__spotlight"]}
                  onClick={() => onSelectLearner(profile.spotlight!.learnerKey)}
                >
                  <span className={styles["school-map__avatar"]} aria-hidden="true">
                    {profile.spotlight.initials}
                  </span>
                  <span>
                    <strong>{profile.spotlight.initials}</strong>
                    <small>{profile.spotlight.streakText}</small>
                    <small>{profile.spotlight.roundsText}</small>
                  </span>
                </button>
              ) : (
                <p className={styles["school-map__prompt"]}>{profile.assignmentsEmpty}</p>
              )}
            </section>
          </div>
        </>
      ) : null}
    </aside>
  );
}

function LearnerProgress({
  learner,
  index,
  ready,
  onSelect,
}: {
  learner: InspectorLearnerRow;
  index: number;
  ready: boolean;
  onSelect: (learnerKey: string) => void;
}) {
  return (
    <li style={{ animationDelay: `${index * 60}ms` }}>
      <button type="button" className={styles["school-map__learner"]} onClick={() => onSelect(learner.learnerKey)}>
        <span className={styles["school-map__avatar"]} aria-hidden="true">
          {learner.initials}
        </span>
        <span>
          <strong>{learner.initials}</strong>
          <small>{learner.level}</small>
        </span>
      </button>
      <span className={`${styles["school-map__bar"]} ${styles[`school-map__bar--${learner.tone}`] ?? ""}`} aria-hidden="true">
        <span style={{ width: ready ? `${learner.barWidth}%` : "0%", transitionDelay: `${index * 70}ms` }} />
      </span>
      <span className={styles["school-map__percent"]}>
        {learner.hasAccuracy ? <CountUp value={`${learner.accuracy}%`} ready={ready} delay={index * 70} /> : "—"}
      </span>
    </li>
  );
}
