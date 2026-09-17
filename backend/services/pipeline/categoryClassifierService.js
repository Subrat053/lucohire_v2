const Category = require('../../models/pipeline/Category');
const CategorySuggestion = require('../../models/pipeline/CategorySuggestion');
const PipelineAuditLog = require('../../models/pipeline/PipelineAuditLog');

/**
 * Service to automatically categorize jobs based on title and description.
 */

const categorizeJob = async (title, description, jobId) => {
  const activeCategories = await Category.find({ isActive: true });
  
  const textToSearch = `${title} ${description}`.toLowerCase();

  let matchedCategory = null;
  let highestMatchCount = 0;
  let matchedKeywords = [];

  for (const category of activeCategories) {
    let matchCount = 0;
    const currentMatches = [];
    
    for (const keyword of category.keywords) {
      if (textToSearch.includes(keyword.toLowerCase())) {
        matchCount++;
        currentMatches.push(keyword);
      }
    }

    if (matchCount > highestMatchCount) {
      highestMatchCount = matchCount;
      matchedCategory = category;
      matchedKeywords = currentMatches;
    }
  }

  if (matchedCategory && highestMatchCount > 0) {
    return {
      categoryId: matchedCategory._id,
      categoryName: matchedCategory.name
    };
  }

  // No match found -> Handle Category Suggestion logic
  // We can extract some keywords based on simple heuristics (e.g., nouns from title) or just log it for manual review
  
  // For simplicity, we just use the first word of the title as a very basic "suggested" category name if it's alphanumeric
  const firstWordMatch = title.match(/^[a-zA-Z]+/);
  const suggestedName = firstWordMatch ? firstWordMatch[0] : 'Unknown';

  let suggestion = await CategorySuggestion.findOne({ suggestedName });
  
  if (suggestion) {
    suggestion.occurrenceCount += 1;
    if (!suggestion.sampleJobIds.includes(jobId) && suggestion.sampleJobIds.length < 10) {
      suggestion.sampleJobIds.push(jobId);
    }
    await suggestion.save();
  } else {
    suggestion = await CategorySuggestion.create({
      suggestedName,
      matchedKeywords: [],
      occurrenceCount: 1,
      sampleJobIds: jobId ? [jobId] : [],
      status: 'pending'
    });
  }

  // Do not assign 'Other' immediately; leave category empty to trigger Needs Review if required.
  return {
    categoryId: null,
    categoryName: null
  };
};

module.exports = {
  categorizeJob
};
