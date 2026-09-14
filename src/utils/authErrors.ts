/**
 * Authentication Error Sanitization & User-Cancellation Handler
 * 
 * Handles user dismissals (closing popups, refusing OAuth permission, user-cancelled)
 * silently with zero UI banners or console errors, and formats real errors cleanly.
 */

export const isSilentAuthCancellation = (err: any): boolean => {
  if (!err) return false;
  
  const code = String(err.code || '').toLowerCase().trim();
  const msg = String(err.message || '').toLowerCase().trim();
  const name = String(err.name || '').toLowerCase().trim();

  // Known Firebase auth cancellation codes
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/user-cancelled' ||
    code === 'auth/cancelled-popup-request' ||
    code === 'auth/popup-blocked' ||
    code === 'auth/credential-already-in-use' ||
    code === 'auth/network-request-failed' && msg.includes('cancel')
  ) {
    return true;
  }

  // Known cancellation/dismissal message fragments
  if (
    msg.includes('user-cancelled') ||
    msg.includes('user cancelled') ||
    msg.includes('cancelled by user') ||
    msg.includes('popup-closed-by-user') ||
    msg.includes('popup was closed') ||
    msg.includes('window closed by user') ||
    msg.includes('closed before completing') ||
    msg.includes('cancelled-popup-request') ||
    msg.includes('idp denied access') ||
    msg.includes('user refuses to grant permission') ||
    msg.includes('refused permission') ||
    msg.includes('cross-origin-opener-policy') ||
    msg.includes('user aborted') ||
    msg.includes('aborted by user') ||
    name === 'aborterror'
  ) {
    return true;
  }

  return false;
};

/**
 * Returns a friendly, customer-facing message without technical Firebase codes or internal stack traces.
 */
export const getCleanAuthErrorMessage = (err: any): string => {
  if (!err || isSilentAuthCancellation(err)) {
    return '';
  }

  const code = String(err.code || '').toLowerCase().trim();
  const msg = String(err.message || '').toLowerCase().trim();

  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    msg.includes('invalid-credential') ||
    msg.includes('wrong-password') ||
    msg.includes('user-not-found') ||
    msg.includes('invalid email or password')
  ) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  if (
    code === 'auth/email-already-in-use' || 
    msg.includes('email-already-in-use') ||
    msg.includes('account with this email address already exists')
  ) {
    return 'An account with this email address already exists. Please Sign In instead.';
  }

  if (
    code === 'auth/weak-password' || 
    msg.includes('weak-password') ||
    msg.includes('password must be at least')
  ) {
    return 'Password is too weak. Please use at least 6 characters.';
  }

  if (
    code === 'auth/too-many-requests' || 
    msg.includes('too-many-requests')
  ) {
    return 'Too many attempts. Please wait a few moments before trying again.';
  }

  if (
    code === 'auth/network-request-failed' ||
    msg.includes('network-request-failed') ||
    msg.includes('failed to fetch')
  ) {
    return 'Network connection issue. Please check your internet connection.';
  }

  // Strip raw Firebase wrappers like "Firebase: Error (auth/...)"
  let clean = String(err.message || 'Authentication could not be completed.');
  clean = clean.replace(/^Firebase:\s*/i, '');
  clean = clean.replace(/\s*\(auth\/[a-z0-9-]+\)\.?/gi, '');
  clean = clean.trim();

  // If after stripping it still has raw technical keywords, give a gentle fallback
  if (clean.includes('auth/') || clean.includes('IdP') || clean.length < 3) {
    return 'Authentication could not be completed. Please try again or use email sign-in.';
  }

  return clean;
};
