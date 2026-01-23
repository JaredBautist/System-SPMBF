import styles from './StatsCard.module.css'

const StatsCard = ({ icon: Icon, title, value, subtitle, trend, color = 'primary' }) => {
  const getTrendClass = () => {
    if (!trend) return ''
    return trend > 0 ? styles.trendUp : trend < 0 ? styles.trendDown : ''
  }

  return (
    <div className={`${styles.statsCard} ${styles[color]}`}>
      <div className={styles.iconWrapper}>
        {Icon && <Icon size={24} />}
      </div>
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        <span className={styles.value}>{value}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        {trend !== undefined && (
          <span className={`${styles.trend} ${getTrendClass()}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
  )
}

export default StatsCard
