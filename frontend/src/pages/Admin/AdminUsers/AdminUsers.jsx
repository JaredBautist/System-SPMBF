import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import userService from '../../../services/userService'
import FormField from '../../../components/FormField'
import FormAlert from '../../../components/FormAlert'
import styles from './AdminUsers.module.css'

const AdminUsers = () => {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'TEACHER',
    password: '',
    is_active: true,
  })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await userService.getAll()
      setUsers(data)
    } catch (err) {
      setLoadError(t('adminUsers.errorLoading'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        password: '',
        is_active: user.is_active,
      })
    } else {
      setEditingUser(null)
      setFormData({
        email: '',
        first_name: '',
        last_name: '',
        role: 'TEACHER',
        password: '',
        is_active: true,
      })
    }
    setErrors({})
    setFormError('')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingUser(null)
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
      case 'email':
        if (!value.trim()) return t('adminUsers.emailRequired')
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) return t('adminUsers.emailInvalid')
        return ''
      case 'first_name':
        if (!value.trim()) return t('adminUsers.nameRequired')
        return ''
      case 'last_name':
        if (!value.trim()) return t('adminUsers.lastNameRequired')
        return ''
      case 'password':
        if (!editingUser && !value) return t('adminUsers.passwordRequired')
        if (value && value.length < 6) return t('adminUsers.passwordMinLength')
        return ''
      default:
        return ''
    }
  }

  const validateForm = () => {
    const newErrors = {}

    const emailError = validateField('email', formData.email)
    if (emailError) newErrors.email = emailError

    const nameError = validateField('first_name', formData.first_name)
    if (nameError) newErrors.first_name = nameError

    const surnameError = validateField('last_name', formData.last_name)
    if (surnameError) newErrors.last_name = surnameError

    const passwordError = validateField('password', formData.password)
    if (passwordError) newErrors.password = passwordError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!validateForm()) return

    try {
      const payload = { ...formData }
      if (editingUser && !payload.password) {
        delete payload.password
      }

      if (editingUser) {
        await userService.update(editingUser.id, payload)
      } else {
        await userService.create(payload)
      }

      await loadUsers()
      handleCloseModal()
    } catch (err) {
      setFormError(err.response?.data?.detail || t('adminUsers.errorSaving'))
    }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('adminUsers.confirmDeactivate'))) return

    try {
      await userService.delete(id)
      await loadUsers()
    } catch (err) {
      alert(t('adminUsers.errorDeactivating'))
      console.error(err)
    }
  }

  if (loading) return <div>{t('adminUsers.loading')}</div>

  return (
    <div className={styles.adminUsersPage}>
      <div className={styles.header}>
        <div>
          <h1>{t('adminUsers.title')}</h1>
          <p>{t('adminUsers.subtitle')}</p>
        </div>
        <button onClick={() => handleOpenModal()} className={styles.createBtn}>
          + {t('adminUsers.createUser')}
        </button>
      </div>

      {loadError && <FormAlert type="error" message={loadError} />}

      {users.length === 0 ? (
        <p className={styles.emptyState}>{t('adminUsers.noUsers')}</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('adminUsers.id')}</th>
                <th>{t('adminUsers.name')}</th>
                <th>{t('adminUsers.email')}</th>
                <th>{t('adminUsers.role')}</th>
                <th>{t('adminUsers.status')}</th>
                <th>{t('adminUsers.registrationDate')}</th>
                <th>{t('adminUsers.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={user.role === 'ADMIN' ? styles.roleAdmin : styles.roleTeacher}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={user.is_active ? styles.statusActive : styles.statusInactive}>
                      {user.is_active ? t('adminUsers.active') : t('adminUsers.inactive')}
                    </span>
                  </td>
                  <td>{new Date(user.date_joined).toLocaleDateString()}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        onClick={() => handleOpenModal(user)}
                        className={styles.editBtn}
                      >
                        {t('adminUsers.edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className={styles.deleteBtn}
                      >
                        {t('adminUsers.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingUser ? t('adminUsers.editUser') : t('adminUsers.createUser')}</h2>
              <button onClick={handleCloseModal} className={styles.closeBtn}>×</button>
            </div>

            <FormAlert
              type="error"
              message={formError}
              onClose={() => setFormError('')}
            />

            <form onSubmit={handleSubmit} className={styles.form}>
              <FormField
                label={t('adminUsers.email')}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.email}
                required
              />

              <div className={styles.formRow}>
                <FormField
                  label={t('adminUsers.name')}
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.first_name}
                  required
                />
                <FormField
                  label={t('adminUsers.lastName')}
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.last_name}
                  required
                />
              </div>

              <FormField
                label={t('adminUsers.role')}
                name="role"
                as="select"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="TEACHER">{t('adminUsers.teacher')}</option>
                <option value="ADMIN">{t('adminUsers.admin')}</option>
              </FormField>

              <FormField
                label={editingUser ? t('adminUsers.passwordKeep') : t('adminUsers.password')}
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.password}
                required={!editingUser}
              />

              <FormField
                type="checkbox"
                name="is_active"
                label={t('adminUsers.activeUser')}
                checked={formData.is_active}
                onChange={handleChange}
              />

              <div className={styles.modalActions}>
                <button type="button" onClick={handleCloseModal} className={styles.cancelBtn}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className={styles.submitBtn}>
                  {editingUser ? t('adminUsers.update') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
