import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameDay,
  parseISO
} from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  Filter,
  X
} from 'lucide-react'
import reservationService from '../../services/reservationService'
import spaceService from '../../services/spaceService'
import ReservationCalendar from '../../components/ReservationCalendar/ReservationCalendar'
import { formatDateTime } from '../../utils/dateUtils'
import styles from './ReservationsCalendar.module.css'

const ReservationsCalendar = () => {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'es' ? es : enUS
  const [reservations, setReservations] = useState([])
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedSpace, setSelectedSpace] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadSpaces()
  }, [])

  useEffect(() => {
    const monthStart = startOfMonth(selectedDate)
    const monthEnd = endOfMonth(selectedDate)
    loadReservations(monthStart, monthEnd)
  }, [selectedDate, selectedSpace])

  const loadSpaces = async () => {
    try {
      const data = await spaceService.getAll()
      setSpaces(data.filter(s => s.is_active))
    } catch (err) {
      console.error('Error loading spaces:', err)
    }
  }

  const loadReservations = async (start, end) => {
    try {
      setLoading(true)
      const params = {
        start: start.toISOString(),
        end: end.toISOString(),
      }
      if (selectedSpace) {
        params.space_id = selectedSpace
      }
      const data = await reservationService.getAll(params)
      setReservations(data)
    } catch (err) {
      setError(t('calendar.errorLoading'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleMonthChange = (start, end) => {
    loadReservations(start, end)
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
  }

  const getReservationsForSelectedDay = () => {
    return reservations.filter(res => {
      const startDate = parseISO(res.start_at)
      return isSameDay(startDate, selectedDate)
    })
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

  const selectedDayReservations = getReservationsForSelectedDay()

  return (
    <div className={styles.calendarPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <Calendar size={32} className={styles.titleIcon} />
            <div>
              <h1>{t('calendar.title')}</h1>
              <p>{t('calendar.subtitle')}</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.filterToggle}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} />
              {t('calendar.filters')}
            </button>
            <Link to="/create-reservation" className={styles.newButton}>
              <Plus size={18} />
              {t('dashboard.newReservation')}
            </Link>
          </div>
        </div>

        {showFilters && (
          <div className={styles.filtersPanel}>
            <div className={styles.filterGroup}>
              <label>{t('calendar.filterBySpace')}</label>
              <select
                value={selectedSpace}
                onChange={(e) => setSelectedSpace(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="">{t('calendar.allSpaces')}</option>
                {spaces.map(space => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedSpace && (
              <button
                className={styles.clearFilter}
                onClick={() => setSelectedSpace('')}
              >
                <X size={14} />
                {t('calendar.clearFilters')}
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        <div className={styles.calendarSection}>
          <ReservationCalendar
            reservations={reservations}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onMonthChange={handleMonthChange}
          />
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.sidePanelHeader}>
            <h3>
              {format(selectedDate, 'EEEE, d MMMM', { locale })}
            </h3>
            <span className={styles.reservationCount}>
              {selectedDayReservations.length} {t('calendar.reservations')}
            </span>
          </div>

          {loading ? (
            <div className={styles.loading}>{t('common.loading')}</div>
          ) : selectedDayReservations.length === 0 ? (
            <div className={styles.emptyDay}>
              <Calendar size={48} className={styles.emptyIcon} />
              <p>{t('calendar.noReservationsDay')}</p>
              <Link to="/create-reservation" className={styles.createLink}>
                <Plus size={16} />
                {t('calendar.createForDay')}
              </Link>
            </div>
          ) : (
            <div className={styles.dayReservations}>
              {selectedDayReservations.map(reservation => (
                <div key={reservation.id} className={styles.reservationCard}>
                  <div className={styles.cardHeader}>
                    <h4>{reservation.title}</h4>
                    {getStatusBadge(reservation.status)}
                  </div>
                  <div className={styles.cardDetails}>
                    <div className={styles.detailItem}>
                      <MapPin size={14} />
                      <span>{reservation.space?.name || t('myReservations.noSpaceAssigned')}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <Clock size={14} />
                      <span>
                        {format(parseISO(reservation.start_at), 'HH:mm')} - {format(parseISO(reservation.end_at), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                  {reservation.description && (
                    <p className={styles.cardDescription}>{reservation.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReservationsCalendar
