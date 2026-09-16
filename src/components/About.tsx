import Section from './Section'
import { summary, education, others } from '../data/resume'
import './About.css'

export default function About() {
  return (
    <Section id="about" index="01" title="关于" en="ABOUT" first>
      <div className="prose">
        {summary.map((line) => (
          <p key={line} data-anim="item">
            {line}
          </p>
        ))}
      </div>
      <div className="meta-row about__scope" data-anim="item">
        <span>{others.scope}</span>
      </div>

      <div className="about__block" id="education" data-anim="item">
        <h3 className="about__subtitle">教育背景</h3>
        <div className="meta-row">
          <span>
            {education.school} · {education.major} · {education.degree}
          </span>
          <span>{education.period}</span>
        </div>
        <ul className="bullet-list about__points">
          {education.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
    </Section>
  )
}
