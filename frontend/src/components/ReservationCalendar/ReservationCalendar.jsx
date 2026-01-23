import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO
} from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import styles from './ReservationCalendar.module.css'

const ReservationCalendar = ({
  reservations = [],
  onDateSelect,
  onMonthChange,
  selectedDate
}) => {
  const { t, i18n } = useTranslation()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const locale = i18n.language === 'es' ? es : enUS

  useEffect(() => {
    if (onMonthChange) {
      const monthStart = startOfMonth(currentMonth)
      const monthEnd = endOfMonth(currentMonth)
      onMonthChange(monthStart, monthEnd)
    }
  }, [currentMonth])

  const goToToday = () => {
    setCurrentMonth(new Date())
    if (onDateSelect) {
      onDateSelect(new Date())
    }
  }

  const renderHeader = () => {
    return (
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <CalendarIcon size={24} className={styles.headerIcon} />
          <h2 className={styles.monthYear}>
            {format(currentMonth, 'MMMM yyyy', { locale })}
          </h2>
        </div>
        <div className={styles.headerNav}>
          <button
            type="button"
            onClick={goToToday}
            className={styles.todayButton}
          >
            {t('calendar.today')}
          </button>
          <div className={styles.navButtons}>
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className={styles.navButton}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className={styles.navButton}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderDays = () => {
    const days = []
    const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 })

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className={styles.dayName}>
          {format(addDays(weekStart, i), 'EEEE', { locale })}
        </div>
      )
    }

    return <div className={styles.daysRow}>{days}</div>
  }

  const getReservationsForDay = (day) => {
    return reservations.filter(res => {
      const startDate = parseISO(res.start_at)
      return isSameDay(startDate, day)
    })
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'PENDING': return styles.statusPending
      case 'APPROVED': return styles.statusApproved
      case 'REJECTED': return styles.statusRejected
      case 'CANCELLED': return styles.statusCancelled
      default: return ''
    }
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day
        const dayReservations = getReservationsForDay(day)
        const isSelected = selectedDate && isSameDay(day, selectedDate)

        days.push(
          <div
            key={day.toString()}
            className={`
              ${styles.cell}
              ${!isSameMonth(day, monthStart) ? styles.disabled : ''}
              ${isToday(day) ? styles.today : ''}
              ${isSelected ? styles.selected : ''}
            `}
            onClick={() => onDateSelect && onDateSelect(cloneDay)}
          >
            <div className={styles.cellHeader}>
              <span className={styles.dayNumber}>{format(day, 'd')}</span>
              {dayReservations.length > 0 && (
                <span className={styles.reservationCount}>
                  {dayReservations.length}
                </span>
              )}
            </div>
            <div className={styles.reservationsList}>
              {dayReservations.slice(0, 3).map((res) => (
                <div
                  key={res.id}
                  className={`${styles.reservationBadge} ${getStatusClass(res.status)}`}
                  title={`${res.title} - ${format(parseISO(res.start_at), 'HH:mm')}`}
                >
                  <span className={styles.reservationTime}>
                    {format(parseISO(res.start_at), 'HH:mm')}
                  </span>
                  <span className={styles.reservationTitle}>{res.title}</span>
                </div>
              ))}
              {dayReservations.length > 3 && (
                <div className={styles.moreReservations}>
                  +{dayReservations.length - 3} {t('calendar.more')}
                </div>
              )}
            </div>
          </div>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div key={day.toString()} className={styles.row}>
          {days}
        </div>
      )
      days = []
    }

    return <div className={styles.body}>{rows}</div>
  }

  return (
    <div className={styles.calendar}>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  )
}

export default ReservationCalendar
