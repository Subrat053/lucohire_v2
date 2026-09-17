const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const getInitials = (name = 'Company') =>
  String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'C';

const formatBudget = (budget) => {
  if (!budget) return 'Negotiable';
  if (budget.perMonth) return `₹${budget.perMonth.toLocaleString('en-IN')}/month`;
  if (budget.perDay) return `₹${budget.perDay.toLocaleString('en-IN')}/day`;
  if (budget.perHour) return `₹${budget.perHour.toLocaleString('en-IN')}/hour`;
  return 'Negotiable';
};

const renderHeader = () => `
  <header class="glass-header">
    <div class="header-container">
      <a href="/" class="logo">
        <span class="logo-accent">Luco</span>hire
      </a>
      <nav class="nav-links">
        <a href="/search" class="nav-link">Find Jobs</a>
        <a href="/login" class="nav-link">Login</a>
        <a href="/signup" class="btn btn-primary">Post a Job</a>
      </nav>
    </div>
  </header>
`;

const renderFooter = () => `
  <footer>
    <div class="footer-container">
      <div class="footer-brand">
        <a href="/" class="logo"><span class="logo-accent">Luco</span>hire</a>
        <p class="footer-tagline">AI-powered hiring engine for local talent & businesses.</p>
      </div>
      <div class="footer-links">
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/contact">Contact</a>
      </div>
    </div>
    <div class="footer-bottom">
      &copy; ${new Date().getFullYear()} Lucohire. All rights reserved.
    </div>
  </footer>
`;

const baseStyles = `
  :root {
    --bg-dark: #08090c;
    --card-bg: #12151c;
    --text-primary: #f3f4f6;
    --text-secondary: #9ca3af;
    --primary: #1677ff;
    --primary-glow: rgba(22, 119, 255, 0.4);
    --accent: #10b981;
    --border: rgba(255, 255, 255, 0.08);
    --font-sans: 'Outfit', 'Inter', -apple-system, sans-serif;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background-color: var(--bg-dark);
    color: var(--text-primary);
    font-family: var(--font-sans);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  a {
    color: inherit;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .glass-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(8, 9, 12, 0.8);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
  }

  .header-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .logo {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.05em;
    color: var(--text-primary);
  }

  .logo-accent {
    color: var(--primary);
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .nav-link {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .nav-link:hover {
    color: var(--text-primary);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.6rem 1.2rem;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    border: none;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%);
    color: #fff;
    box-shadow: 0 4px 14px var(--primary-glow);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(22, 119, 255, 0.6);
  }

  .btn-block {
    display: flex;
    width: 100%;
  }

  main {
    flex: 1;
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 2rem 4rem 2rem;
  }

  .hero {
    text-align: center;
    padding: 4rem 2rem;
    background: radial-gradient(circle at 50% 0%, rgba(22, 119, 255, 0.15) 0%, transparent 60%);
    border-radius: 24px;
    border: 1px solid var(--border);
    margin-bottom: 3rem;
  }

  .hero h1 {
    font-size: 3rem;
    font-weight: 900;
    letter-spacing: -0.03em;
    line-height: 1.2;
    margin-bottom: 1rem;
    background: linear-gradient(135deg, #fff 40%, var(--text-secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .hero p {
    color: var(--text-secondary);
    font-size: 1.15rem;
    max-width: 600px;
    margin: 0 auto 2rem auto;
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1.5rem;
  }

  .job-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .job-card:hover {
    transform: translateY(-4px);
    border-color: rgba(22, 119, 255, 0.3);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4), 0 0 15px var(--primary-glow);
  }

  .job-title {
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
    color: #fff;
  }

  .job-company {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .company-avatar {
    width: 36px;
    height: 36px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    font-weight: 800;
    color: var(--text-primary);
  }

  .job-info-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.6rem;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: capitalize;
  }

  .badge-primary {
    background: rgba(22, 119, 255, 0.15);
    color: #60a5fa;
    border: 1px solid rgba(22, 119, 255, 0.2);
  }

  .badge-success {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }

  .badge-warning {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.2);
  }

  .job-desc {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .job-card-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border);
    padding-top: 1.25rem;
    margin-top: auto;
  }

  .job-salary {
    font-weight: 800;
    font-size: 1.15rem;
    color: #fff;
  }

  /* Job Detail Specific Styles */
  .detail-container {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 2rem;
    align-items: start;
  }

  .detail-main {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 2.5rem;
  }

  .detail-sidebar {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 2rem;
    position: sticky;
    top: 100px;
  }

  .section-title {
    font-size: 1.35rem;
    font-weight: 800;
    margin: 2rem 0 1rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
    color: #fff;
  }

  .section-title:first-of-type {
    margin-top: 0;
  }

  .detail-hero {
    margin-bottom: 2.5rem;
  }

  .detail-hero h1 {
    font-size: 2.5rem;
    font-weight: 900;
    margin-bottom: 0.75rem;
    line-height: 1.2;
    color: #fff;
  }

  .meta-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .meta-item {
    display: flex;
    justify-content: space-between;
    font-size: 0.95rem;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
    padding-bottom: 0.75rem;
  }

  .meta-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .meta-label {
    color: var(--text-secondary);
  }

  .meta-value {
    color: var(--text-primary);
    font-weight: 700;
  }

  .description-content {
    font-size: 1rem;
    line-height: 1.7;
    color: #d1d5db;
    white-space: pre-line;
  }

  .requirements-list {
    margin-left: 1.5rem;
    margin-top: 0.5rem;
    color: #d1d5db;
  }

  .requirements-list li {
    margin-bottom: 0.5rem;
  }

  .apply-cta {
    width: 100%;
    margin-top: 1.5rem;
    padding: 1.1rem;
    font-size: 1.05rem;
    font-weight: 800;
    border-radius: 14px;
    animation: pulse-glow 2s infinite;
  }

  @keyframes pulse-glow {
    0% {
      box-shadow: 0 4px 14px var(--primary-glow);
    }
    50% {
      box-shadow: 0 4px 20px rgba(22, 119, 255, 0.8), 0 0 10px rgba(59, 130, 246, 0.5);
    }
    100% {
      box-shadow: 0 4px 14px var(--primary-glow);
    }
  }

  footer {
    background: #040507;
    border-top: 1px solid var(--border);
    padding: 4rem 2rem 2rem 2rem;
    margin-top: 6rem;
  }

  .footer-container {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 2rem;
  }

  .footer-brand {
    max-width: 350px;
  }

  .footer-tagline {
    color: var(--text-secondary);
    font-size: 0.85rem;
    margin-top: 0.75rem;
  }

  .footer-links {
    display: flex;
    gap: 2.5rem;
  }

  .footer-links a {
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .footer-links a:hover {
    color: var(--text-primary);
  }

  .footer-bottom {
    max-width: 1200px;
    margin: 3rem auto 0 auto;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  @media (max-width: 768px) {
    .detail-container {
      grid-template-columns: 1fr;
    }
    .detail-sidebar {
      position: static;
    }
    .hero h1 {
      font-size: 2.2rem;
    }
    main {
      padding: 1.5rem 1rem;
    }
    .detail-main {
      padding: 1.5rem;
    }
  }
`;

function renderSeoLandingPage(page, meta, jobs) {
  const cardsHtml = jobs.length > 0 
    ? jobs.map(job => {
        const jobSlug = escapeHtml(job.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
        const detailUrl = `/jobs/${jobSlug}-${job._id}`;
        const initials = getInitials(job.companyName || 'C');
        const budgetFormatted = formatBudget(job.budget);
        
        return `
          <article class="job-card">
            <div>
              <h2 class="job-title"><a href="${detailUrl}">${escapeHtml(job.title)}</a></h2>
              <div class="job-company">
                <div class="company-avatar">${escapeHtml(initials)}</div>
                <span>${escapeHtml(job.companyName || 'Verified Recruiter')}</span>
              </div>
              <div class="job-info-row">
                <span class="badge badge-primary">${escapeHtml(job.workMode || 'Onsite')}</span>
                <span class="badge badge-success">${escapeHtml((job.scheduleType || 'Flexible').replace('_', ' '))}</span>
                <span class="badge badge-warning">${escapeHtml(job.city)}</span>
              </div>
              <p class="job-desc">${escapeHtml(job.description)}</p>
            </div>
            <div class="job-card-actions">
              <span class="job-salary">${escapeHtml(budgetFormatted)}</span>
              <a href="${detailUrl}" class="btn btn-outline">Apply Now</a>
            </div>
          </article>
        `;
      }).join('')
    : '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">No active job postings found matching this category in this location. Explore other vacancies by using our Talent Search.</div>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <meta name="keywords" content="${escapeHtml(meta.keywords.join(', '))}">
  <link rel="canonical" href="https://www.lucohire.com/jobs/${escapeHtml(page.slug)}">
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    ${baseStyles}
  </style>
</head>
<body>
  ${renderHeader()}
  
  <main>
    <section class="hero">
      <h1>${escapeHtml(page.keyword)} Jobs in ${escapeHtml(page.city)}</h1>
      <p>Discover ${page.job_count} active vacancies for ${escapeHtml(page.keyword)} in ${escapeHtml(page.city)}. Direct recruiters are actively hiring right now. Pitch and apply for free!</p>
      <a href="/search" class="btn btn-primary">Browse All Active Postings</a>
    </section>
    
    <section>
      <div class="grid-container">
        ${cardsHtml}
      </div>
    </section>
  </main>
  
  ${renderFooter()}
</body>
</html>`;
}

function renderJobDetailPage(job) {
  const initials = getInitials(job.companyName || 'C');
  const budgetFormatted = formatBudget(job.budget);
  const datePostedStr = (job.createdAt || new Date()).toISOString();
  
  const schemaJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description,
    "datePosted": datePostedStr,
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.companyName || "Verified Recruiter",
      "logo": "https://www.lucohire.com/logo.png"
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.city,
        "addressCountry": "IN"
      }
    },
    "baseSalary": {
      "@type": "MonetaryAmount",
      "currency": job.budget?.currency || "INR",
      "value": {
        "@type": "QuantitativeValue",
        "value": job.budget?.perMonth || job.budget?.perDay || job.budget?.perHour || 0,
        "unitText": job.budget?.perMonth ? "MONTH" : job.budget?.perDay ? "DAY" : job.budget?.perHour ? "HOUR" : "MONTH"
      }
    },
    "employmentType": job.scheduleType === "full_time" ? "FULL_TIME" : job.scheduleType === "part_time" ? "PART_TIME" : "CONTRACTOR"
  });

  const breadcrumbsJson = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.lucohire.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Jobs",
        "item": "https://www.lucohire.com/search"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": job.city || "Remote",
        "item": `https://www.lucohire.com/search?location=${encodeURIComponent(job.city || 'Remote')}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": job.title
      }
    ]
  });

  const requirementsHtml = Array.isArray(job.requirements) && job.requirements.length > 0
    ? `<ul class="requirements-list">${job.requirements.map(req => `<li>${escapeHtml(req)}</li>`).join('')}</ul>`
    : '<p class="description-content">Basic professional requirements apply. Connect with the recruiter to clarify details.</p>';

  const pageTitle = `${escapeHtml(job.title)} Job in ${escapeHtml(job.city)} at ${escapeHtml(job.companyName || 'Verified Recruiter')} | Lucohire`;
  const pageDesc = `Apply for ${escapeHtml(job.title)} position in ${escapeHtml(job.city)}. Salary: ${escapeHtml(budgetFormatted)}, Schedule: ${escapeHtml(job.scheduleType || 'Flexible')}. Contact recruiter directly via Lucohire.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDesc}">
  
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  
  <style>
    ${baseStyles}
  </style>

  <!-- Job Posting JSON-LD Structured Data Schema Inserter -->
  <script type="application/ld+json">
    ${schemaJson}
  </script>
  <!-- Breadcrumbs JSON-LD -->
  <script type="application/ld+json">
    ${breadcrumbsJson}
  </script>
</head>
<body>
  ${renderHeader()}
  
  <main>
    <div class="detail-container">
      <div class="detail-main">
        <div class="detail-hero">
          <div class="job-company" style="font-size: 1.1rem;">
            <div class="company-avatar" style="width: 44px; height: 44px; font-size: 1.15rem;">${escapeHtml(initials)}</div>
            <span>${escapeHtml(job.companyName || 'Verified Recruiter')}</span>
          </div>
          <h1>${escapeHtml(job.title)}</h1>
          <div class="job-info-row" style="margin-top: 1rem;">
            <span class="badge badge-primary">${escapeHtml(job.workMode || 'Onsite')}</span>
            <span class="badge badge-success">${escapeHtml((job.scheduleType || 'Flexible').replace('_', ' '))}</span>
            <span class="badge badge-warning">${escapeHtml(job.city)}</span>
          </div>
        </div>

        <h2 class="section-title">Job Description</h2>
        <div class="description-content">${escapeHtml(job.description)}</div>

        <h2 class="section-title">Job Requirements</h2>
        <div>${requirementsHtml}</div>
      </div>

      <div class="detail-sidebar">
        <h2 class="section-title" style="margin-top: 0;">Job Overview</h2>
        <ul class="meta-list">
          <li class="meta-item">
            <span class="meta-label">Salary Range</span>
            <span class="meta-value">${escapeHtml(budgetFormatted)}</span>
          </li>
          <li class="meta-item">
            <span class="meta-label">Job Category</span>
            <span class="meta-value">${escapeHtml(job.skill)}</span>
          </li>
          <li class="meta-item">
            <span class="meta-label">Location</span>
            <span class="meta-value">${escapeHtml(job.city)}</span>
          </li>
          <li class="meta-item">
            <span class="meta-label">Work Mode</span>
            <span class="meta-value" style="text-transform: capitalize;">${escapeHtml(job.workMode || 'Onsite')}</span>
          </li>
          <li class="meta-item">
            <span class="meta-label">Posted Date</span>
            <span class="meta-value">${new Date(job.createdAt || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </li>
        </ul>
        
        <a href="/login?redirect=jobs/${job._id}&action=apply" class="btn btn-primary btn-block apply-cta">Apply On Lucohire</a>
      </div>
    </div>
  </main>
  
  ${renderFooter()}
</body>
</html>`;
}

module.exports = {
  renderSeoLandingPage,
  renderJobDetailPage
};
