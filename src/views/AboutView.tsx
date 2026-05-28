import { useT } from '../i18n'
import styles from './AboutView.module.css'

export function AboutView() {
  const t = useT()
  const a = t.about

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.heading}>{a.projectTitle}</h2>
        <p className={styles.text}>{a.projectDesc}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{a.rulesTitle}</h2>
        <ol className={styles.rules}>
          {a.rules.map((rule, i) => (
            <li key={i} className={styles.rule}>{rule}</li>
          ))}
        </ol>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>{a.techTitle}</h2>
        <div className={styles.techPills}>
          {a.techList.map(tech => (
            <span key={tech} className={styles.pill}>{tech}</span>
          ))}
        </div>
      </section>
    </div>
  )
}
