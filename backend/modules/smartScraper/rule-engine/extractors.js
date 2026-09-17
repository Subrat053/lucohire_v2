/**
 * Default heuristic CSS selectors for common ATS/Career page structures.
 * These are used as fallbacks if no learned selectors exist for the domain.
 */
const DEFAULT_SELECTORS = {
  jobContainer: ['.job-listing', '.posting', '.job-item', 'li.job', 'tr.job', '.career-job'],
  title: ['h1', 'h2', 'h3', '.job-title', '.posting-title', '[itemprop="title"]'],
  location: ['.location', '.job-location', '.sort-by-location', '[itemprop="jobLocation"]'],
  employmentType: ['.commitment', '.job-type', '.employment-type', '[itemprop="employmentType"]'],
  experience: ['.experience', '.level', '.job-level'],
  salary: ['.salary', '.compensation', '[itemprop="baseSalary"]'],
  applyUrl: ['.apply-button', '.apply-link', 'a.apply', 'a[href*="apply"]'],
  description: ['.description', '.job-description', '[itemprop="description"]', 'main']
};

module.exports = { DEFAULT_SELECTORS };
