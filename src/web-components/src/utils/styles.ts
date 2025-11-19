/**
 * Team D Color System
 * Centralized color constants for Team D branding
 */
export const teamDColors = {
  primary: '#8b5cf6', // Purple
  background: '#f9fafb',
  bgGray: '#f3f4f6',
  bgLight: '#f9fafb',
  textDark: '#1f2937',
  textLight: '#6b7280',
  border: '#dee2e6',
  selected: '#007bff',
  error: '#dc2626',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  success: '#10b981',
  warning: '#f59e0b',
} as const;

/**
 * Common inline styles for Team D components
 */
export const teamDStyles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: teamDColors.bgGray,
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  button: {
    width: '100%',
    backgroundColor: teamDColors.primary,
    color: 'white',
    padding: '12px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '500' as const,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${teamDColors.border}`,
    borderRadius: '6px',
    fontSize: '16px',
    boxSizing: 'border-box' as const,
  },
} as const;
