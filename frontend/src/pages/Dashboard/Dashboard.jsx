import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  BookOpen,
  PlusCircle,
  CheckCircle,
  Clock,
  CalendarCheck,
  AlertCircle,
  Building2,
  MapPin,
  FileDown
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import reservationService from '../../services/reservationService'
import StatsCard from '../../components/StatsCard/StatsCard'
import { formatDateTime } from '../../utils/dateUtils'
import {
  startOfMonth,
  endOfMonth,
  differenceInHours,
  differenceInMinutes,
  parseISO
} from 'date-fns'
import styles from './Dashboard.module.css'

const Dashboard = () => {
  const { t } = useTranslation()
  const { user, isAdmin } = useAuth()
  const [upcomingReservations, setUpcomingReservations] = useState([])
  const [stats, setStats] = useState({
    totalMonth: 0,
    pending: 0,
    approved: 0,
    nextReservation: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      const now = new Date()
      const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)

      // Admin ve todas las reservas, docente solo las suyas
      const serviceMethod = isAdmin() ? reservationService.getAll : reservationService.getMine

      // Load upcoming reservations for next 7 days
      const upcomingData = await serviceMethod({
        start: now.toISOString(),
        end: end.toISOString(),
      })

      // Load all reservations this month for stats
      const monthData = await serviceMethod({
        start: monthStart.toISOString(),
        end: monthEnd.toISOString(),
      })

      setUpcomingReservations(upcomingData.slice(0, 5))

      // Calculate stats
      const pendingCount = monthData.filter(r => r.status === 'PENDING').length
      const approvedCount = monthData.filter(r => r.status === 'APPROVED').length

      // Find next upcoming approved reservation
      const nextApproved = upcomingData.find(r => r.status === 'APPROVED')

      setStats({
        totalMonth: monthData.length,
        pending: pendingCount,
        approved: approvedCount,
        nextReservation: nextApproved || null
      })
    } catch (err) {
      setError(t('calendar.errorLoading'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getTimeUntilNext = () => {
    if (!stats.nextReservation) return null
    const now = new Date()
    const start = parseISO(stats.nextReservation.start_at)
    const hours = differenceInHours(start, now)
    const minutes = differenceInMinutes(start, now) % 60

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { label: t('status.pending'), className: styles.statusPending },
      APPROVED: { label: t('status.approved'), className: styles.statusApproved },
      REJECTED: { label: t('status.rejected'), className: styles.statusRejected },
      CANCELLED: { label: t('status.cancelled'), className: styles.statusCancelled },
    }
    const statusInfo = statusMap[status] || { label: status, className: '' }
    return <span className={`${styles.badge} ${statusInfo.className}`}>{statusInfo.label}</span>
  }

  const actionCards = [
    {
      to: '/spaces',
      icon: Building2,
      title: t('dashboard.availableSpaces'),
      description: t('dashboard.availableSpacesDesc')
    },
    {
      to: '/my-reservations',
      icon: BookOpen,
      title: t('dashboard.myReservations'),
      description: t('dashboard.myReservationsDesc')
    },
    {
      to: '/create-reservation',
      icon: PlusCircle,
      title: t('dashboard.newReservation'),
      description: t('dashboard.newReservationDesc')
    },
    {
      to: '/calendar',
      icon: CalendarDays,
      title: t('calendar.title'),
      description: t('calendar.subtitle')
    }
  ]

  if (isAdmin()) {
    actionCards.push({
      to: '/admin/reservations',
      icon: CheckCircle,
      title: t('dashboard.approveReservations'),
      description: t('dashboard.approveReservationsDesc')
    })
  }

  const handleDownloadReport = async () => {
    try {
      setReportError('')
      setReportLoading(true)
      const data = await reservationService.downloadReport()
      const blob = new Blob([data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte-reservas-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      setReportError(t('dashboard.reportError'))
    } finally {
      setReportLoading(false)
    }
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>{t('dashboard.welcome', { name: user?.first_name })}</h1>
        <div className={styles.headerRow}>
          <p>{t('dashboard.subtitle')}</p>
          {isAdmin() && (
            <div className={styles.headerActions}>
              <button
                className={styles.downloadBtn}
                onClick={handleDownloadReport}
                disabled={reportLoading}
              >
                <FileDown size={16} />
                {reportLoading ? t('dashboard.generatingReport') : t('dashboard.downloadReport')}
              </button>
              {reportError && <span className={styles.reportError}>{reportError}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <div className={styles.statsGrid}>
        <StatsCard
          icon={CalendarCheck}
          title={t('stats.totalReservations')}
          value={stats.totalMonth}
          color="primary"
        />
        <StatsCard
          icon={Clock}
          title={t('stats.pending')}
          value={stats.pending}
          color="warning"
        />
        <StatsCard
          icon={CheckCircle}
          title={t('stats.approved')}
          value={stats.approved}
          color="success"
        />
        <StatsCard
          icon={AlertCircle}
          title={t('stats.nextReservation')}
          value={getTimeUntilNext() || '--'}
          subtitle={stats.nextReservation?.title}
          color="info"
        />
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        {actionCards.map((card, index) => (
          <Link
            key={card.to}
            to={card.to}
            className={styles.actionCard}
            style={{ animationDelay: `${0.1 + index * 0.05}s` }}
          >
            <div className={styles.actionIcon}>
              <card.icon size={24} />
            </div>
            <div className={styles.actionContent}>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Upcoming Reservations */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{t('dashboard.upcomingReservations')}</h2>
          <Link to="/my-reservations" className={styles.viewAllLink}>
            {t('calendar.viewAll')}
          </Link>
        </div>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>{t('common.loading')}</p>
          </div>
        ) : error ? (
          <p className={styles.error}>{error}</p>
        ) : upcomingReservations.length === 0 ? (
          <div className={styles.emptyState}>
            <CalendarDays size={48} className={styles.emptyIcon} />
            <p>{t('dashboard.noReservations')}</p>
            <Link to="/create-reservation" className={styles.createButton}>
              <PlusCircle size={18} />
              {t('dashboard.newReservation')}
            </Link>
          </div>
        ) : (
          <div className={styles.reservationsList}>
            {upcomingReservations.map((reservation, index) => (
              <div
                key={reservation.id}
                className={styles.reservationCard}
                style={{ animationDelay: `${0.2 + index * 0.05}s` }}
              >
                <div className={styles.reservationHeader}>
                  <h3>{reservation.title}</h3>
                  {getStatusBadge(reservation.status)}
                </div>
                <div className={styles.reservationDetails}>
                  <p>
                    <MapPin size={14} />
                    <span>{reservation.space?.name || 'N/A'}</span>
                  </p>
                  <p>
                    <Clock size={14} />
                    <span>{formatDateTime(reservation.start_at)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
