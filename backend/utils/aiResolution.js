const crypto = require('crypto');
const prisma = require('../config/prisma');

/**
 * Resolves the resume or profile data of a provider.
 * 
 * 1. Checks if the provider has uploaded a resume (resumeUrl).
 *    If yes, searches the ResumeFileCache by resumeUrl. If found, returns the cached parsed data and hash.
 * 2. If no resume was uploaded or no cache was found, checks if they have completed their profile data.
 *    If yes, compiles the profile data, generates a sha256 hash of it, and returns the compiled data.
 * 3. Otherwise, returns an error message telling the user to upload their resume or complete their profile.
 */
const resolveUserData = async (userId) => {
  try {
    const provider = await prisma.providerProfile.findUnique({
      where: { user: String(userId) },
      include: { userRecord: true },
    });
    if (!provider) {
      return { error: 'Provider profile not found.' };
    }

    // 1. Check for uploaded resume (Prioritize latest pending upload, then approved)
    const latestResumeUrl = provider.resumeApproval?.pendingUrl || provider.resumeUrl;
    
    if (latestResumeUrl) {
      const cacheEntry = await prisma.resumeFileCache.findFirst({
        where: { resumeUrl: latestResumeUrl },
        orderBy: { createdAt: 'desc' },
      });
      if (cacheEntry) {
        // Merge the cached resume data with the latest profile fields
        // Concatenate arrays and strings so AI gets the full picture from both sources.
        const mergedData = {
          ...cacheEntry.parsedResult,
          name: provider.userRecord?.name || provider.profileName || cacheEntry.parsedResult?.name || "",
          skills: Array.from(new Set([...(cacheEntry.parsedResult?.skills || []), ...(provider.skills || [])])),
          experience: [cacheEntry.parsedResult?.experience, provider.experience].filter(Boolean).join('\n\n--- Profile Experience ---\n'),
          city: provider.city || cacheEntry.parsedResult?.city || "",
          state: provider.state || cacheEntry.parsedResult?.state || "",
          description: [cacheEntry.parsedResult?.description, provider.description].filter(Boolean).join('\n\n--- Profile Description ---\n'),
          education: provider.education?.length > 0 ? provider.education : (cacheEntry.parsedResult?.education || []),
          projects: provider.projects?.length > 0 ? provider.projects : (cacheEntry.parsedResult?.projects || []),
          previousExperience: provider.previousExperience?.length > 0 ? provider.previousExperience : (cacheEntry.parsedResult?.previousWork || [])
        };

        const mergedHash = crypto.createHash('sha256').update(JSON.stringify(mergedData)).digest('hex');

        return {
          fileHash: mergedHash,
          dataToAnalyze: mergedData,
          source: 'merged'
        };
      }
    }

    // 2. Fallback to profile data if completed
    const hasProfileData = provider.skills && provider.skills.length > 0 && provider.description;
    if (hasProfileData) {
      const profileParsedData = {
        name: provider.userRecord?.name || provider.profileName || "",
        skills: provider.skills || [],
        experience: provider.experience || "",
        tier: provider.tier || "unskilled",
        languages: provider.languages || [],
        description: provider.description || "",
        pricing: provider.pricing || "",
        pricingType: provider.pricingType || "",
        city: provider.city || "",
        state: provider.state || "",
        locations: provider.locations || [],
        education: provider.education || [],
        projects: provider.projects || [],
        previousExperience: provider.previousExperience || []
      };
      
      const targetHash = crypto.createHash('sha256').update(JSON.stringify(profileParsedData)).digest('hex');
      return {
        fileHash: targetHash,
        dataToAnalyze: profileParsedData,
        source: 'profile'
      };
    }

    // 3. Neither works
    return {
      error: 'To access this feature, please upload your resume or complete your profile details (roles/skills and description).'
    };
  } catch (err) {
    return { error: 'Error resolving user data: ' + err.message };
  }
};

module.exports = {
  resolveUserData
};
