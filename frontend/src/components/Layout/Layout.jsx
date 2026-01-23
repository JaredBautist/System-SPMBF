import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Home,
  Users,
  Building2,
  CalendarCheck,
  CalendarDays,
  LogOut
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import ThemeToggle from '../ThemeToggle/ThemeToggle'
import LanguageToggle from '../LanguageToggle/LanguageToggle'
import styles from './Layout.module.css'

const Layout = ({ children }) => {
  const { t } = useTranslation()
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/calendar', label: t('nav.calendar'), icon: CalendarDays }
  ]

  const adminLinks = [
    { path: '/admin/users', label: t('nav.users'), icon: Users },
    { path: '/admin/spaces', label: t('nav.adminSpaces'), icon: Building2 },
    { path: '/admin/reservations', label: t('nav.adminReservations'), icon: CalendarCheck }
  ]

  return (
    <div className={styles.layout}>
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.navBrand}>
            <Link to="/">{t('nav.brand')}</Link>
          </div>

          <div className={styles.navLinks}>
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`${styles.navLink} ${isActive(link.path) ? styles.active : ''}`}
              >
                <link.icon size={18} />
                <span>{link.label}</span>
              </Link>
            ))}

            {isAdmin() && (
              <>
                <div className={styles.divider}></div>
                {adminLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`${styles.navLink} ${isActive(link.path) ? styles.active : ''}`}
                  >
                    <link.icon size={18} />
                    <span>{link.label}</span>
                  </Link>
                ))}
              </>
            )}
          </div>

          <div className={styles.navUser}>
            <span className={styles.userName}>
              {user?.first_name} {user?.last_name}
              <span className={isAdmin() ? styles.badgeAdmin : styles.badgeTeacher}>
                {isAdmin() ? t('nav.administrator') : t('nav.teacher')}
              </span>
            </span>
            <LanguageToggle />
            <ThemeToggle />
            <button onClick={handleLogout} className={styles.logoutBtn}>
              <LogOut size={18} />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.container}>
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
