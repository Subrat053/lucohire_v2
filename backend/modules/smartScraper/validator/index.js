const { z } = require('zod');

// Schema based on user specification
const jobSchema = z.object({
  title: z.string().nullable().describe("Job title"),
  company: z.string().nullable().describe("Company name"),
  location: z.string().nullable().describe("Job location"),
  employmentType: z.string().nullable().describe("Full-time, Part-time, Contract, etc."),
  experience: z.string().nullable().describe("Experience level required"),
  salary: z.string().nullable().describe("Salary range or information"),
  skills: z.array(z.string()).nullable().default([]).describe("Required skills"),
  responsibilities: z.array(z.string()).nullable().default([]).describe("Key responsibilities"),
  qualifications: z.array(z.string()).nullable().default([]).describe("Required qualifications"),
  description: z.string().nullable().describe("A brief description of the job"),
  applyUrl: z.string().nullable().describe("URL to apply for the job")
});

const jobsResponseSchema = z.object({
  jobs: z.array(jobSchema)
});

/**
 * Validates and normalizes the extracted data.
 * 
 * @param {any} data - The extracted JSON data
 * @param {string} sourceUrl - The original URL for resolving relative paths
 * @returns {any} Normalized and validated data
 */
function validateAndNormalize(data, sourceUrl) {
  try {
    // 1. Zod Validation
    const parsed = jobsResponseSchema.parse(data);

    // 2. Normalization
    parsed.jobs = parsed.jobs.map(job => {
      // Normalize whitespace for all string fields
      Object.keys(job).forEach(key => {
        if (typeof job[key] === 'string') {
          job[key] = job[key].replace(/\s+/g, ' ').trim();
        }
      });

      // Convert relative URLs to absolute URLs
      
      // Ensure arrays are at least empty arrays instead of null
      job.skills = job.skills || [];
      job.responsibilities = job.responsibilities || [];
      job.qualifications = job.qualifications || [];

      if (job.applyUrl && !job.applyUrl.startsWith('http')) {
        try {
          const base = new URL(sourceUrl);
          job.applyUrl = new URL(job.applyUrl, base.origin).toString();
        } catch (e) {
          // If URL parsing fails, keep it as is
        }
      } else if (!job.applyUrl) {
        // Fallback to source URL if no applyUrl is found
        job.applyUrl = sourceUrl;
      }

      return job;
    });

    return { success: true, data: parsed };
  } catch (error) {
    console.error('[Validator] Schema validation failed:', error.message || error);
    return { success: false, error: error.message || 'Validation failed' };
  }
}

module.exports = {
  jobSchema,
  jobsResponseSchema,
  validateAndNormalize
};
