import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  Filter,
  MapPin,
  Calendar,
  MessageSquare,
  Trash2,
  Plus,
  Loader2
} from 'lucide-react'
import reservationService from '../../services/reservationService'
import { formatDateTime } from '../../utils/dateUtils'
import styles from './MyReservations.module.css'

const MyReservations = () => {
  const { t } = useTranslation()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadReservations()
  }, [])

  const loadReservations = async () => {
    try {
      setLoading(true)
      const data = await reservationService.getMine()
      setReservations(data)
    } catch (err) {
      setError(t('myReservations.errorLoading'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id) => {
    if (!confirm(t('myReservations.confirmCancel'))) {
      return
    }

    try {
      await reservationService.cancel(id)
      await loadReservations()
    } catch (err) {
      alert(t('myReservations.errorCanceling'))
      console.error(err)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock size={14} />
      case 'APPROVED': return <CheckCircle size={14} />
      case 'REJECTED': return <XCircle size={14} />
      case 'CANCELLED': return <Ban size={14} />
      default: return null
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: { label: t('status.pending'), className: styles.statusPending },
      APPROVED: { label: t('status.approved'), className: styles.statusApproved },
      REJECTED: { label: t('status.rejected'), className: styles.statusRejected },
      CANCELLED: { label: t('status.cancelled'), className: styles.statusCancelled },
    }
    const statusInfo = statusMap[status] || { label: status, className: '' }
    return (
      <span className={`${styles.badge} ${statusInfo.className}`}>
        {getStatusIcon(status)}
        {statusInfo.label}
      </span>
    )
  }

  const filteredReservations = reservations.filter(r => {
    if (filter === 'all') return true
    return r.status === filter
  })

  const stats = {
    total: reservations.length,
    pending: reservations.filter(r => r.status === 'PENDING').length,
    approved: reservations.filter(r => r.status === 'APPROVED').length,
    rejected: reservations.filter(r => r.status === 'REJECTED').length,
    cancelled: reservations.filter(r => r.status === 'CANCELLED').length,
  }

  const filterButtons = [
    { key: 'all', label: t('myReservations.all'), count: stats.total, icon: Filter },
    { key: 'PENDING', label: t('myReservations.pending'), count: stats.pending, icon: Clock },
    { key: 'APPROVED', label: t('myReservations.approved'), count: stats.approved, icon: CheckCircle },
    { key: 'REJECTED', label: t('myReservations.rejected'), count: stats.rejected, icon: XCircle },
    { key: 'CANCELLED', label: t('myReservations.cancelled'), count: stats.cancelled, icon: Ban },
  ]

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 size={40} className={styles.spinnerIcon} />
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (error) {
    return <div className={styles.error}>{error}</div>
  }

  return (
    <div className={styles.myReservationsPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <div className={styles.titleIcon}>
              <BookOpen size={28} />
            </div>
            <div>
              <h1>{t('myReservations.title')}</h1>
              <p>{t('myReservations.subtitle')}</p>
            </div>
          </div>
          <Link to="/create-reservation" className={styles.newButton}>
            <Plus size={18} />
            {t('dashboard.newReservation')}
          </Link>
        </div>

        {/* Mini Stats */}
        <div className={styles.miniStats}>
          <div className={styles.miniStat}>
            <span className={styles.miniStatValue}>{stats.total}</span>
            <span className={styles.miniStatLabel}>{t('myReservations.all')}</span>
          </div>
          <div className={`${styles.miniStat} ${styles.pending}`}>
            <span className={styles.miniStatValue}>{stats.pending}</span>
            <span className={styles.miniStatLabel}>{t('myReservations.pending')}</span>
          </div>
          <div className={`${styles.miniStat} ${styles.approved}`}>
            <span className={styles.miniStatValue}>{stats.approved}</span>
            <span className={styles.miniStatLabel}>{t('myReservations.approved')}</span>
          </div>
          <div className={`${styles.miniStat} ${styles.rejected}`}>
            <span className={styles.miniStatValue}>{stats.rejected}</span>
            <span className={styles.miniStatLabel}>{t('myReservations.rejected')}</span>
          </div>
        </div>
      </div>

      <div className={styles.filters}>
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            className={`${styles.filterBtn} ${filter === btn.key ? styles.filterActive : ''}`}
            onClick={() => setFilter(btn.key)}
          >
            <btn.icon size={16} />
            <span>{btn.label}</span>
            <span className={styles.filterCount}>{btn.count}</span>
          </button>
        ))}
      </div>

      {filteredReservations.length === 0 ? (
        <div className={styles.emptyState}>
          <Calendar size={48} className={styles.emptyIcon} />
          <p>{t('myReservations.noReservations')}</p>
          <Link to="/create-reservation" className={styles.createButton}>
            <Plus size={18} />
            {t('dashboard.newReservation')}
          </Link>
        </div>
      ) : (
        <div className={styles.reservationsList}>
          {filteredReservations.map((reservation, index) => (
            <div
              key={reservation.id}
              className={styles.reservationCard}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={styles.cardHeader}>
                <div>
                  <h3>{reservation.title}</h3>
                  <p className={styles.spaceInfo}>
                    <MapPin size={14} />
                    {reservation.space?.name || t('myReservations.noSpaceAssigned')}
                  </p>
                </div>
                {getStatusBadge(reservation.status)}
              </div>

              <div className={styles.cardBody}>
                {reservation.description && (
                  <p className={styles.description}>{reservation.description}</p>
                )}

                <div className={styles.details}>
                  <div className={styles.detailItem}>
                    <Calendar size={14} />
                    <div>
                      <strong>{t('myReservations.start')}</strong>
                      <span>{formatDateTime(reservation.start_at)}</span>
                    </div>
                  </div>
                  <div className={styles.detailItem}>
                    <Clock size={14} />
                    <div>
                      <strong>{t('myReservations.end')}</strong>
                      <span>{formatDateTime(reservation.end_at)}</span>
                    </div>
                  </div>
                </div>

                {reservation.decision_note && (
                  <div className={styles.decisionNote}>
                    <MessageSquare size={14} />
                    <div>
                      <strong>{t('myReservations.decisionNote')}</strong>
                      <p>{reservation.decision_note}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.cardActions}>
                {(reservation.status === 'PENDING' || reservation.status === 'APPROVED') && (
                  <button
                    onClick={() => handleCancel(reservation.id)}
                    className={styles.cancelBtn}
                  >
                    <Trash2 size={16} />
                    {t('myReservations.cancelReservation')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyReservations
