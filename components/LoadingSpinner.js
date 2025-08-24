import styles from './LoadingSpinner.module.css';

const LoadingSpinner = ({ message = "Generating your images...", size = "medium" }) => {
  return (
    <div className={styles.container}>
      <div className={`${styles.spinner} ${styles[size]}`}>
        <div className={styles.spinnerInner}></div>
      </div>
      <p className={styles.message}>{message}</p>
      <div className={styles.progressSteps}>
        <div className={styles.step}>
          <div className={styles.stepIndicator}></div>
          <span className={styles.stepText}>Processing prompt</span>
        </div>
        <div className={styles.step}>
          <div className={styles.stepIndicator}></div>
          <span className={styles.stepText}>Generating images</span>
        </div>
        <div className={styles.step}>
          <div className={styles.stepIndicator}></div>
          <span className={styles.stepText}>Finalizing results</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;