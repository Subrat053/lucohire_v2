/**
 * Generates a BreadcrumbList JSON-LD Schema
 * @param {Array<{name: string, item: string}>} crumbs - Array of breadcrumb objects
 * @returns {Object} JSON-LD Schema object
 */
export const generateBreadcrumbSchema = (crumbs = []) => {
  if (!crumbs || crumbs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.item
    }))
  };
};

/**
 * Generates a JobPosting JSON-LD Schema
 * @param {Object} job - Job data object
 * @param {string} siteUrl - Base URL of the site
 * @returns {Object} JSON-LD Schema object
 */
export const generateJobPostingSchema = (job, siteUrl) => {
  if (!job) return null;

  const validThrough = job.deadline ? new Date(job.deadline).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": job.description || job.title,
    "identifier": {
      "@type": "PropertyValue",
      "name": job.companyName || "LucoHire",
      "value": job._id
    },
    "datePosted": job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
    "validThrough": validThrough,
    "employmentType": job.jobType === "full-time" ? "FULL_TIME" : job.jobType === "part-time" ? "PART_TIME" : "CONTRACTOR",
    "hiringOrganization": {
      "@type": "Organization",
      "name": job.companyName || "Confidential",
      "sameAs": siteUrl
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": job.location || job.city || "Remote",
        "addressCountry": "IN"
      }
    },
    "baseSalary": job.minSalary && job.maxSalary ? {
      "@type": "MonetaryAmount",
      "currency": "INR",
      "value": {
        "@type": "QuantitativeValue",
        "minValue": job.minSalary,
        "maxValue": job.maxSalary,
        "unitText": "YEAR"
      }
    } : undefined
  };
};

/**
 * Generates a ProfilePage JSON-LD Schema
 * @param {Object} profile - User profile data object
 * @param {string} profileUrl - Full URL to the profile
 * @returns {Object} JSON-LD Schema object
 */
export const generateProfileSchema = (profile, profileUrl) => {
  if (!profile) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "dateCreated": profile.createdAt ? new Date(profile.createdAt).toISOString() : new Date().toISOString(),
    "dateModified": profile.updatedAt ? new Date(profile.updatedAt).toISOString() : new Date().toISOString(),
    "mainEntity": {
      "@type": "Person",
      "name": `${profile.firstName} ${profile.lastName}`,
      "jobTitle": profile.title || "Professional",
      "url": profileUrl,
      "image": profile.profilePicture || `${profileUrl}/default-avatar.png`,
      "description": profile.bio || `Professional profile for ${profile.firstName} ${profile.lastName}`,
      "address": profile.city ? {
        "@type": "PostalAddress",
        "addressLocality": profile.city,
        "addressCountry": "IN"
      } : undefined
    }
  };
};
