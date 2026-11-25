import {
  BarChart3,
  ChevronRight,
  ChevronsRight,
  Clock3,
  Folder,
  LayoutDashboard,
  Search,
  Upload,
} from 'lucide-react'
import type { DashboardAppBarProps, DashboardNavItem } from '../../../types/dashboard'
import './shell.css'

const navigation: { label: DashboardNavItem; href: string; icon: typeof LayoutDashboard }[] = [
  { label: 'Dashboard', href: '#dashboard', icon: LayoutDashboard },
  { label: 'Upload', href: '#upload', icon: Upload },
  { label: 'Files', href: '#files', icon: Folder },
  { label: 'Search', href: '#search', icon: Search },
  { label: 'History', href: '#history', icon: Clock3 },
  { label: 'Kibana', href: '#kibana', icon: ChevronsRight },
]

function AppBar({
  activeItem = 'Dashboard',
  userName = 'Alex Morgan',
  userRole = 'DevOps Engineer',
}: DashboardAppBarProps) {
  return (
    <header className="dashboard-appbar">
      <a className="dashboard-brand" href="#dashboard" aria-label="LogSight dashboard">
        <span className="dashboard-brand-mark"><BarChart3 size={17} strokeWidth={2.6} /></span>
        <span>LogSight</span>
      </a>

      <nav className="dashboard-nav" aria-label="Main navigation">
        {navigation.map(({ label, href, icon: Icon }) => (
          <a
            className={`dashboard-nav-link${label === activeItem ? ' is-active' : ''}`}
            href={href}
            key={label}
            aria-current={label === activeItem ? 'page' : undefined}
          >
            <Icon size={14} strokeWidth={1.8} />
            <span>{label}</span>
          </a>
        ))}
      </nav>

      <div className="dashboard-account">
        <div className="dashboard-avatar" aria-hidden="true">
          {userName.split(' ').map((part) => part[0]).join('').slice(0, 2)}
        </div>
        <div className="dashboard-account-copy">
          <span>{userName}</span>
          <small>{userRole}</small>
        </div>
        <ChevronRight className="dashboard-account-chevron" size={14} />
      </div>
    </header>
  )
}

export default AppBar