import Section from './Section'
import { highlights } from '../data/resume'
import './Highlights.css'

export default function Highlights() {
  return (
    <Section id="highlights" index="04" title="项目亮点" en="HIGHLIGHTS">
      <div className="highlights">
        {highlights.map((item) => (
          <div className="highlight" key={item.title} data-anim="item">
            <h3 className="highlight__title">{item.title}</h3>
            <p className="highlight__text">{item.text}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}
