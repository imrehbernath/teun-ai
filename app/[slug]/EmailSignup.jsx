'use client';

import { useState } from 'react';
import styles from './EmailSignup.module.css';

export default function EmailSignup({ 
  title = "Blijf op de hoogte van GEO-updates",
  compact = false 
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');

    // TODO: Voeg hier je email signup logica toe (bijv. API call)
    console.log('Email submitted:', email);
    
    // Simulatie voor nu
    setTimeout(() => {
      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <div className={`${styles.emailSignup} ${compact ? styles.compact : ''}`}>
      <h3 className={styles.title}>{title}</h3>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Vul je emailadres in *"
          required
          className={styles.input}
          disabled={status === 'loading'}
        />
        <button 
          type="submit" 
          className={styles.button}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'BEZIG...' : 'VERZENDEN'}
        </button>
      </form>

      {status === 'success' && (
        <p className={styles.success}>✓ Bedankt! Je bent aangemeld.</p>
      )}
      {status === 'error' && (
        <p className={styles.error}>Er ging iets mis. Probeer het opnieuw.</p>
      )}
    </div>
  );
}