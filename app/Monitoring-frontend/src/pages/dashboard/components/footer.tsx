import { BarChart3 } from 'lucide-react'
import './shell.css'

function Footer() {
  return (
    <footer className="dashboard-footer">
      <a className="dashboard-footer-brand" href="#dashboard">
        <span className="dashboard-brand-mark"><BarChart3 size={15} strokeWidth={2.6} /></span>
        <span>LogSight</span>
      </a>
      <span className="dashboard-footer-project">ITBS Mini-Project ELK</span>
      <nav className="dashboard-footer-links" aria-label="Footer navigation">
        <a href="#design-system">Design system</a>
        <a href="#sign-out">Sign out</a>
        <a href="#help">Help</a>
      </nav>
      <span className="dashboard-copyright">© 2025 LogSight</span>
    </footer>
  )
}

export default Footer