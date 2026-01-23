import { useState } from 'react'
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
import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './MiniCalendar.module.css'

const MiniCalendar = ({
  reservations = [],
  selectedDate,
  onDateSelect,
  highlightedDate
}) => {
  const { t, i18n } = useTranslation()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const locale = i18n.language === 'es' ? es : enUS

  const renderHeader = () => {
    return (
      <div className={styles.header}>
        <button
          type="button"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className={styles.navButton}
        >
          <ChevronLeft size={18} />
        </button>
        <span className={styles.monthYear}>
          {format(currentMonth, 'MMMM yyyy', { locale })}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className={styles.navButton}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    )
  }

  const renderDays = () => {
    const days = []
    const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 })

    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className={styles.dayName}>
          {format(addDays(weekStart, i), 'EEE', { locale }).substring(0, 2)}
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
      case 'PENDING': return styles.pending
      case 'APPROVED': return styles.approved
      case 'REJECTED': return styles.rejected
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
        const isHighlighted = highlightedDate && isSameDay(day, highlightedDate)

        days.push(
          <div
            key={day.toString()}
            className={`
              ${styles.cell}
              ${!isSameMonth(day, monthStart) ? styles.disabled : ''}
              ${isToday(day) ? styles.today : ''}
              ${isSelected ? styles.selected : ''}
              ${isHighlighted ? styles.highlighted : ''}
            `}
            onClick={() => onDateSelect && onDateSelect(cloneDay)}
          >
            <span className={styles.dayNumber}>{format(day, 'd')}</span>
            {dayReservations.length > 0 && (
              <div className={styles.reservationDots}>
                {dayReservations.slice(0, 3).map((res, idx) => (
                  <span
                    key={idx}
                    className={`${styles.dot} ${getStatusClass(res.status)}`}
                    title={res.title}
                  />
                ))}
                {dayReservations.length > 3 && (
                  <span className={styles.moreDots}>+{dayReservations.length - 3}</span>
                )}
              </div>
            )}
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
    <div className={styles.miniCalendar}>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.pending}`}></span>
          {t('status.pending')}
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.approved}`}></span>
          {t('status.approved')}
        </span>
      </div>
    </div>
  )
}

export default MiniCalendar
