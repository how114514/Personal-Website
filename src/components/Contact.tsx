import Section from './Section'
import { profile, others } from '../data/resume'
import './Contact.css'

const items = [
  { label: '邮箱', value: profile.email, href: `mailto:${profile.email}` },
  { label: '电话', value: profile.phone },
  { label: 'GitHub', value: profile.github, href: `https://${profile.github}` },
]

export default function Contact() {
  return (
    <Section id="contact" index="05" title="联系方式" en="CONTACT">
      <ul className="contact">
        {items.map((item) => (
          <li className="contact__item" key={item.label} data-anim="item">
            <span className="contact__label">{item.label}</span>
            {item.href ? (
              <a
                className="contact__value"
                href={item.href}
                target={item.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
              >
                {item.value}
              </a>
            ) : (
              <span className="contact__value">{item.value}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="contact__note" data-anim="item">
        {others.githubNote}
      </p>
    </Section>
  )
}
