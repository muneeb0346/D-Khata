import styles from './Spinner.module.css';

export function Spinner() {
  return (
    <div className={styles.container} aria-live="polite" aria-busy="true">
      <span className={styles.spinner} role="progressbar" aria-valuetext="Loading" />
    </div>
  );
}
