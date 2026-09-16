import Section from './Section'
import { skills } from '../data/resume'
import './Skills.css'

export default function Skills() {
  return (
    <Section id="skills" index="02" title="技能 / 技术栈" en="SKILLS">
      <div className="skills">
        {skills.map((group) => (
          <div className="skill" key={group.category} data-anim="item">
            <h3 className="skill__category">{group.category}</h3>
            <div className="skill__body">
              <p className="skill__desc">{group.description}</p>
              <ul className="tag-list">
                {group.keywords.map((keyword) => (
                  <li className="tag" key={keyword}>
                    {keyword}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
