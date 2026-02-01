import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import spaceService from '../../../services/spaceService'
import FormField from '../../../components/FormField'
import FormAlert from '../../../components/FormAlert'
import styles from './AdminSpaces.module.css'

const AdminSpaces = () => {
  const { t } = useTranslation()
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingSpace, setEditingSpace] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    is_active: true,
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    loadSpaces()
  }, [])

  const loadSpaces = async () => {
    try {
      setLoading(true)
      const data = await spaceService.getAll()
      setSpaces(data)
    } catch (err) {
      setLoadError(t('adminSpaces.errorLoading'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (space = null) => {
    if (space) {
      setEditingSpace(space)
      setFormData({
        name: space.name,
        description: space.description,
        location: space.location,
        is_active: space.is_active,
      })
    } else {
      setEditingSpace(null)
      setFormData({
        name: '',
        description: '',
        location: '',
        is_active: true,
      })
    }
    setErrors({})
    setFormError('')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingSpace(null)
    setErrors({})
    setFormError('')
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
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

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value.trim()) return t('adminSpaces.nameRequired')
        if (value.length < 2) return t('adminSpaces.nameMinLength')
        return ''
      case 'description':
        if (!value.trim()) return t('adminSpaces.descriptionRequired')
        return ''
      case 'location':
        if (!value.trim()) return t('adminSpaces.locationRequired')
        return ''
      default:
        return ''
    }
  }

  const validateForm = () => {
    const newErrors = {}

    const nameError = validateField('name', formData.name)
    if (nameError) newErrors.name = nameError

    const descError = validateField('description', formData.description)
    if (descError) newErrors.description = descError

    const locError = validateField('location', formData.location)
    if (locError) newErrors.location = locError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!validateForm()) return

    try {
      if (editingSpace) {
        await spaceService.update(editingSpace.id, formData)
      } else {
        await spaceService.create(formData)
      }

      await loadSpaces()
      handleCloseModal()
    } catch (err) {
      setFormError(err.response?.data?.detail || t('adminSpaces.errorSaving'))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('adminSpaces.confirmDelete'))) return

    try {
      await spaceService.delete(id)
      await loadSpaces()
    } catch (err) {
      alert(t('adminSpaces.errorDeleting'))
      console.error(err)
    }
  }

  if (loading) return <div>{t('adminSpaces.loading')}</div>

  return (
    <div className={styles.adminSpacesPage}>
      <div className={styles.header}>
        <div>
          <h1>{t('adminSpaces.title')}</h1>
          <p>{t('adminSpaces.subtitle')}</p>
        </div>
        <button onClick={() => handleOpenModal()} className={styles.createBtn}>
          + {t('adminSpaces.createSpace')}
        </button>
      </div>

      {loadError && <FormAlert type="error" message={loadError} />}

      {spaces.length === 0 ? (
        <p className={styles.emptyState}>{t('adminSpaces.noSpaces')}</p>
      ) : (
        <div className={styles.spacesGrid}>
          {spaces.map(space => (
            <div key={space.id} className={styles.spaceCard}>
              <div className={styles.cardHeader}>
                <h3>{space.name}</h3>
                <span className={space.is_active ? styles.statusActive : styles.statusInactive}>
                  {space.is_active ? t('adminSpaces.active') : t('adminSpaces.inactive')}
                </span>
              </div>
              <p className={styles.description}>{space.description}</p>
              <p className={styles.location}>
                <strong>{t('adminSpaces.location')}:</strong> {space.location}
              </p>
              <div className={styles.cardActions}>
                <button
                  onClick={() => handleOpenModal(space)}
                  className={styles.editBtn}
                >
                  {t('adminSpaces.edit')}
                </button>
                <button
                  onClick={() => handleDelete(space.id)}
                  className={styles.deleteBtn}
                >
                  {t('adminSpaces.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingSpace ? t('adminSpaces.editSpace') : t('adminSpaces.createSpace')}</h2>
              <button onClick={handleCloseModal} className={styles.closeBtn}>×</button>
            </div>

            <FormAlert
              type="error"
              message={formError}
              onClose={() => setFormError('')}
            />

            <form onSubmit={handleSubmit} className={styles.form}>
              <FormField
                label={t('adminSpaces.name')}
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.name}
                required
                placeholder={t('adminSpaces.namePlaceholder')}
              />

              <FormField
                label={t('adminSpaces.description')}
                name="description"
                as="textarea"
                value={formData.description}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.description}
                required
                rows={3}
                placeholder={t('adminSpaces.descriptionPlaceholder')}
              />

              <FormField
                label={t('adminSpaces.location')}
                name="location"
                value={formData.location}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.location}
                required
                placeholder={t('adminSpaces.locationPlaceholder')}
              />

              <FormField
                type="checkbox"
                name="is_active"
                label={t('adminSpaces.activeSpace')}
                checked={formData.is_active}
                onChange={handleChange}
              />

              <div className={styles.modalActions}>
                <button type="button" onClick={handleCloseModal} className={styles.cancelBtn}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className={styles.submitBtn}>
                  {editingSpace ? t('adminSpaces.update') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSpaces
