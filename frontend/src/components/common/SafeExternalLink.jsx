import React from 'react';

/**
 * A highly secure external link component that protects against reverse tab-nabbing
 * and strips malicious javascript: protocols.
 */
const SafeExternalLink = ({ href, children, className = '', ...props }) => {
  const sanitizeUrl = (urlStr) => {
    if (!urlStr || typeof urlStr !== 'string') return '#';
    const trimmed = urlStr.trim();
    const lower = trimmed.toLowerCase();
    
    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.includes('<script>')) {
      return '#';
    }
    
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    
    return trimmed;
  };

  const safeHref = sanitizeUrl(href);

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...props}
    >
      {children}
    </a>
  );
};

export default SafeExternalLink;
