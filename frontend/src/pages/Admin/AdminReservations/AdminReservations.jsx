import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import reservationService from '../../../services/reservationService'
import { formatDateTime } from '../../../utils/dateUtils'
import styles from './AdminReservations.module.css'

const AdminReservations = () => {
  const { t } = useTranslation()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('PENDING')
  const [showDecisionModal, setShowDecisionModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [decisionType, setDecisionType] = useState('')

  useEffect(() => {
    loadReservations()
  }, [])

  const loadReservations = async () => {
    try {
      setLoading(true)
      // Obtener reservas con un rango más amplio para asegurar que se vean todas las pendientes
      const now = new Date()
      const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 días atrás
      const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 días adelante
      const params = {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
      const data = await reservationService.getAll(params)
      setReservations(data)
    } catch (err) {
      setError(t('common.error'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDecisionModal = (reservation, type) => {
    setSelectedReservation(reservation)
    setDecisionType(type)
    setDecisionNote('')
    setShowDecisionModal(true)
  }

  const handleCloseDecisionModal = () => {
    setShowDecisionModal(false)
    setSelectedReservation(null)
    setDecisionNote('')
    setDecisionType('')
  }

  const handleDecision = async () => {
    try {
      if (decisionType === 'approve') {
        await reservationService.approve(selectedReservation.id, decisionNote)
      } else {
        await reservationService.reject(selectedReservation.id, decisionNote)
      }

      await loadReservations()
      handleCloseDecisionModal()
    } catch (err) {
      alert(t('adminReservations.errorRequest'))
      console.error(err)
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
    return <span className={`${styles.badge} ${statusInfo.className}`}>{statusInfo.label}</span>
  }

  const filteredReservations = reservations.filter(r => {
    if (filter === 'all') return true
    return r.status === filter
  })

  if (loading) return <div>{t('common.loading')}</div>
  if (error) return <div className={styles.error}>{error}</div>

  return (
    <div className={styles.adminReservationsPage}>
      <div className={styles.header}>
        <div>
          <h1>{t('adminReservations.title')}</h1>
          <p>{t('adminReservations.subtitle')}</p>
        </div>
      </div>

      <div className={styles.filters}>
        <button
          className={filter === 'PENDING' ? styles.filterActive : ''}
          onClick={() => setFilter('PENDING')}
        >
          {t('adminReservations.pending')} ({reservations.filter(r => r.status === 'PENDING').length})
        </button>
        <button
          className={filter === 'APPROVED' ? styles.filterActive : ''}
          onClick={() => setFilter('APPROVED')}
        >
          {t('adminReservations.approved')} ({reservations.filter(r => r.status === 'APPROVED').length})
        </button>
        <button
          className={filter === 'REJECTED' ? styles.filterActive : ''}
          onClick={() => setFilter('REJECTED')}
        >
          {t('adminReservations.rejected')} ({reservations.filter(r => r.status === 'REJECTED').length})
        </button>
        <button
          className={filter === 'CANCELLED' ? styles.filterActive : ''}
          onClick={() => setFilter('CANCELLED')}
        >
          {t('adminReservations.cancelled')} ({reservations.filter(r => r.status === 'CANCELLED').length})
        </button>
        <button
          className={filter === 'all' ? styles.filterActive : ''}
          onClick={() => setFilter('all')}
        >
          {t('adminReservations.all')} ({reservations.length})
        </button>
      </div>

      {filteredReservations.length === 0 ? (
        <p className={styles.emptyState}>{t('adminReservations.noReservations')}</p>
      ) : (
        <div className={styles.reservationsList}>
          {filteredReservations.map((reservation) => (
            <div key={reservation.id} className={styles.reservationCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h3>{reservation.title}</h3>
                  <p className={styles.createdBy}>
                    {t('adminReservations.bookedBy')}: {reservation.created_by?.first_name} {reservation.created_by?.last_name}
                  </p>
                </div>
                {getStatusBadge(reservation.status)}
              </div>

              <div className={styles.cardBody}>
                <p className={styles.spaceInfo}>
                  <strong>{t('adminReservations.space')}:</strong> {reservation.space?.name || t('adminReservations.unassigned')}
                </p>

                {reservation.description && (
                  <p className={styles.description}>{reservation.description}</p>
                )}

                <div className={styles.details}>
                  <div className={styles.detailItem}>
                    <strong>{t('adminReservations.starting')}:</strong>
                    <span>{formatDateTime(reservation.start_at)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <strong>{t('adminReservations.ending')}:</strong>
                    <span>{formatDateTime(reservation.end_at)}</span>
                  </div>
                </div>

                {reservation.decision_note && (
                  <div className={styles.decisionNote}>
                    <strong>{t('adminReservations.note')}:</strong>
                    <p>{reservation.decision_note}</p>
                    {reservation.approved_by && (
                      <p className={styles.approver}>
                        {t('adminReservations.by')}: {reservation.approved_by.first_name} {reservation.approved_by.last_name}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {reservation.status === 'PENDING' && (
                <div className={styles.cardActions}>
                  <button
                    onClick={() => handleOpenDecisionModal(reservation, 'approve')}
                    className={styles.approveBtn}
                  >
                    {t('adminReservations.approve')}
                  </button>
                  <button
                    onClick={() => handleOpenDecisionModal(reservation, 'reject')}
                    className={styles.rejectBtn}
                  >
                    {t('adminReservations.reject')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showDecisionModal && (
        <div className={styles.modalOverlay} onClick={handleCloseDecisionModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                {decisionType === 'approve' ? t('adminReservations.approveTitle') : t('adminReservations.rejectTitle')}
              </h2>
              <button onClick={handleCloseDecisionModal} className={styles.closeBtn}>×</button>
            </div>

            <div className={styles.modalBody}>
              <p><strong>{t('adminReservations.book')}:</strong> {selectedReservation?.title}</p>
              <p><strong>{t('adminReservations.space')}:</strong> {selectedReservation?.space?.name}</p>
              <p><strong>{t('adminReservations.date')}:</strong> {formatDateTime(selectedReservation?.start_at)}</p>

              <div className={styles.formGroup}>
                <label>{t('adminReservations.noteOptional')}</label>
                <textarea
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  rows="3"
                  placeholder={t('adminReservations.notePlaceholder')}
                />
              </div>

              <div className={styles.modalActions}>
                <button onClick={handleCloseDecisionModal} className={styles.cancelBtn}>
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDecision}
                  className={decisionType === 'approve' ? styles.confirmApproveBtn : styles.confirmRejectBtn}
                >
                  {decisionType === 'approve' ? t('adminReservations.confirmApprove') : t('adminReservations.confirmReject')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReservations
