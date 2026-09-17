import React from 'react';

/**
 * LoadingButton — A reusable button component with loading state.
 *
 * Props:
 *   - loading {boolean} - Shows spinner and disables the button when true
 *   - children {ReactNode} - Button label content
 *   - loadingText {string} - Text to show while loading (default: 'Please wait...')
 *   - type {string} - 'submit' | 'button' | 'reset' (default: 'button')
 *   - disabled {boolean} - Additional disabled state
 *   - onClick {Function} - Click handler (for type="button")
 *   - className {string} - Custom class names (merged with base styles)
 *   - spinnerClass {string} - Custom spinner class (optional)
 *
 * Usage:
 *   <LoadingButton
 *     loading={isSubmitting}
 *     loadingText="Saving..."
 *     type="submit"
 *     className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold"
 *   >
 *     Save Profile
 *   </LoadingButton>
 */
const LoadingButton = ({
  loading = false,
  children,
  loadingText = 'Please wait...',
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  spinnerClass = '',
  ...rest
}) => {
  const isDisabled = loading || disabled;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      aria-busy={loading}
      aria-disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <>
          <span
            className={`inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0 ${spinnerClass}`}
            aria-hidden="true"
          />
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;
