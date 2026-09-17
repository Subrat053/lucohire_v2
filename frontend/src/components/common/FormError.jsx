import React from 'react';

/**
 * FormError — A reusable field-level or form-level error display component.
 *
 * Props:
 *   - message {string} - Error message to display. If empty/null, renders nothing.
 *   - className {string} - Extra classes (optional)
 *   - role {string} - ARIA role (default: 'alert')
 *
 * Usage (field-level):
 *   <FormError message={errors.email} />
 *
 * Usage (form-level banner):
 *   <FormError message={errors.general} className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200" />
 */
const FormError = ({ message, className = '', role = 'alert' }) => {
  if (!message) return null;

  return (
    <p
      role={role}
      aria-live="polite"
      className={`text-red-700 text-xs font-medium mt-1 leading-snug ${className}`}
    >
      {message}
    </p>
  );
};

export default FormError;
