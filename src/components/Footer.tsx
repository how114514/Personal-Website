import { profile } from '../data/resume'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <span>
          {profile.name} · {profile.title}
        </span>
        <a href={`https://${profile.github}`} target="_blank" rel="noreferrer">
          {profile.github}
        </a>
      </div>
    </footer>
  )
}
