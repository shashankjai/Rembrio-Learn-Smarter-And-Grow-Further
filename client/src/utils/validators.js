// Client-side validation mirrors the server rules (the server remains the source of truth).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email) {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL.test(email.trim())) return 'Enter a valid email address';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (password.length > 128) return 'Password must be at most 128 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must contain at least one letter and one number';
  return '';
}

export function validateName(name) {
  const n = name.trim();
  if (!n) return 'Name is required';
  if (n.length < 2) return 'Name must be at least 2 characters';
  if (n.length > 80) return 'Name must be at most 80 characters';
  return '';
}

export function validateRegister({ name, email, password, confirmPassword }) {
  const errors = {
    name: validateName(name),
    email: validateEmail(email),
    password: validatePassword(password),
    confirmPassword: !confirmPassword ? 'Confirm your password' : confirmPassword !== password ? 'Passwords do not match' : '',
  };
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
}

export function validateLogin({ email, password }) {
  const errors = { email: validateEmail(email), password: password ? '' : 'Password is required' };
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v));
}

export const MAX_UPLOAD_MB = 20;
export function validatePdfFile(file) {
  if (!file) return 'Choose a PDF file';
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'Only PDF files are supported';
  if (file.size === 0) return 'This file is empty';
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `File is too large (max ${MAX_UPLOAD_MB} MB)`;
  return '';
}
