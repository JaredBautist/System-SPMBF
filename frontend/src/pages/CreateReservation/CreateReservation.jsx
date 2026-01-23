import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { parseISO } from 'date-fns'
import {
  Building2,
  FileText,
  AlignLeft,
  Clock,
  CalendarPlus,
  ArrowLeft,
  Send,
  Loader2
} from 'lucide-react'
import spaceService from '../../services/spaceService'
import reservationService from '../../services/reservationService'
import FormField from '../../components/FormField'
import FormAlert from '../../components/FormAlert'
import MiniCalendar from '../../components/MiniCalendar/MiniCalendar'
import styles from './CreateReservation.module.css'

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

const CreateReservation = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [spaces, setSpaces] = useState([])
  const [formData, setFormData] = useState({
    space: '',
    title: '',
    description: '',
    start_at: '',
    end_at: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)
  const [busyReservations, setBusyReservations] = useState([])
  const [busyError, setBusyError] = useState('')
  const [busyLoading, setBusyLoading] = useState(false)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date())

  useEffect(() => {
    loadSpaces()
  }, [])

  useEffect(() => {
    if (formData.space) {
      loadBusyReservations(formData.space)
    } else {
      setBusyReservations([])
    }
  }, [formData.space])

  const loadSpaces = async () => {
    try {
      const data = await spaceService.getAll()
      const activeSpaces = data.filter(s => s.is_active)
      setSpaces(activeSpaces)
      if (activeSpaces.length && !formData.space) {
        setFormData(prev => ({ ...prev, space: String(activeSpaces[0].id) }))
      }
    } catch (err) {
      console.error('Error loading spaces...', err)
    }
  }

  const loadBusyReservations = async (spaceId) => {
    try {
      setBusyLoading(true)
      setBusyError('')
      const params = {
        space_id: spaceId,
        start: new Date().toISOString(),
        end: daysFromNow(30).toISOString(),
      }
      const reservations = await reservationService.getAll(params)
      setBusyReservations(reservations)
    } catch (err) {
      console.error('Error fetching reservations...', err)
      setBusyError(t('createReservation.errorLoading') || 'No se pudieron cargar las reservas')
    } finally {
      setBusyLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    const error = validateField(name, value)
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  const handleCalendarDateSelect = (date) => {
    setSelectedCalendarDate(date)
    // Pre-fill the start date with selected date at 09:00
    const dateStr = date.toISOString().split('T')[0]
    setFormData(prev => ({
      ...prev,
      start_at: `${dateStr}T09:00`,
      end_at: `${dateStr}T10:00`
    }))
  }

  const validateField = (name, value) => {
    switch (name) {
      case 'title':
        if (!value.trim()) return t('createReservation.errorTitle')
        return ''
      case 'start_at':
        if (!value) return t('createReservation.errorStartDate')
        return ''
      case 'end_at':
        if (!value) return t('createReservation.errorEndDate')
        if (formData.start_at && new Date(value) <= new Date(formData.start_at)) {
          return t('createReservation.errorDateOrder')
        }
        return ''
      default:
        return ''
    }
  }

  const validateDuration = () => {
    if (!formData.start_at || !formData.end_at) {
      return t('createReservation.errorStartDate')
    }

    const start = new Date(formData.start_at)
    const end = new Date(formData.end_at)
    const durationMinutes = (end - start) / (1000 * 60)

    if (durationMinutes < 30) {
      return t('createReservation.errorMinDuration')
    }

    if (durationMinutes > 240) {
      return t('createReservation.errorMaxDuration')
    }

    if (start >= end) {
      return t('createReservation.errorDateOrder')
    }

    return null
  }

  const validateForm = () => {
    const newErrors = {}

    const titleError = validateField('title', formData.title)
    if (titleError) newErrors.title = titleError

    const startError = validateField('start_at', formData.start_at)
    if (startError) newErrors.start_at = startError

    const endError = validateField('end_at', formData.end_at)
    if (endError) newErrors.end_at = endError
    if (!formData.space) newErrors.space = t('createReservation.selectSpace')

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setSuccess(false)

    if (!validateForm()) return

    const durationError = validateDuration()
    if (durationError) {
      setFormError(durationError)
      return
    }

    try {
      setLoading(true)

      const payload = {
        title: formData.title,
        description: formData.description,
        start_at: new Date(formData.start_at).toISOString(),
        end_at: new Date(formData.end_at).toISOString(),
      }

      if (!formData.space) {
        setFormError(t('createReservation.selectSpace'))
        return
      }

      payload.space_id = parseInt(formData.space, 10)

      await reservationService.create(payload)
      setSuccess(true)

      setTimeout(() => {
        navigate('/my-reservations')
      }, 2000)
    } catch (err) {
      const errorMsg = err.response?.data?.detail ||
                       err.response?.data?.error ||
                       t('createReservation.errorMessage')
      setFormError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Get highlighted date from form if set
  const highlightedDate = formData.start_at ? parseISO(formData.start_at) : null

  return (
    <div className={styles.createPage}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <CalendarPlus size={32} />
        </div>
        <div>
          <h1>{t('createReservation.title')}</h1>
          <p>{t('createReservation.subtitle')}</p>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.formSection}>
          <div className={styles.formContainer}>
            <FormAlert
              type="success"
              message={success ? t('createReservation.successMessage') : ''}
            />

            <FormAlert
              type="error"
              message={formError}
              onClose={() => setFormError('')}
            />

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <Building2 size={16} />
                  {t('createReservation.selectSpace')}
                </label>
                <select
                  name="space"
                  value={formData.space}
                  onChange={handleChange}
                  className={styles.formSelect}
                >
                  <option value="">{t('createReservation.autoAssign')}</option>
                  {spaces.map(space => (
                    <option key={space.id} value={space.id}>
                      {space.name} - {space.location}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <FileText size={16} />
                  {t('createReservation.formTitle')} *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`${styles.formInput} ${errors.title ? styles.inputError : ''}`}
                  placeholder={t('createReservation.titlePlaceholder')}
                />
                {errors.title && <span className={styles.errorText}>{errors.title}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <AlignLeft size={16} />
                  {t('createReservation.description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className={styles.formTextarea}
                  rows={3}
                  placeholder={t('createReservation.descriptionPlaceholder')}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <Clock size={16} />
                    {t('createReservation.startDate')} *
                  </label>
                  <input
                    type="datetime-local"
                    name="start_at"
                    value={formData.start_at}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`${styles.formInput} ${errors.start_at ? styles.inputError : ''}`}
                  />
                  {errors.start_at && <span className={styles.errorText}>{errors.start_at}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <Clock size={16} />
                    {t('createReservation.endDate')} *
                  </label>
                  <input
                    type="datetime-local"
                    name="end_at"
                    value={formData.end_at}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`${styles.formInput} ${errors.end_at ? styles.inputError : ''}`}
                  />
                  {errors.end_at && <span className={styles.errorText}>{errors.end_at}</span>}
                </div>
              </div>

              <div className={styles.info}>
                <p><strong>{t('createReservation.errorMinDuration')}</strong></p>
                <p><strong>{t('createReservation.errorMaxDuration')}</strong></p>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className={styles.cancelBtn}
                >
                  <ArrowLeft size={18} />
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className={styles.spinnerIcon} />
                      {t('createReservation.submitting')}
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      {t('createReservation.submitButton')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className={styles.calendarSection}>
          <div className={styles.calendarCard}>
            <h3>{t('createReservation.availabilityTitle')}</h3>
            <p className={styles.calendarHint}>{t('createReservation.calendarHint')}</p>

            {busyLoading ? (
              <div className={styles.calendarLoading}>
                <Loader2 size={24} className={styles.spinnerIcon} />
                <span>{t('common.loading')}</span>
              </div>
            ) : busyError ? (
              <FormAlert type="error" message={busyError} />
            ) : (
              <MiniCalendar
                reservations={busyReservations}
                selectedDate={selectedCalendarDate}
                onDateSelect={handleCalendarDateSelect}
                highlightedDate={highlightedDate}
              />
            )}

            {!formData.space && (
              <p className={styles.selectSpaceHint}>{t('createReservation.selectSpaceToSee')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateReservation
