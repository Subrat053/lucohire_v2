/**
 * ResumeParserProvider Interface
 */
class ResumeParserProvider {
  /**
   * Parses a document buffer into structured canonical resume data with evidence
   * @param {Buffer} buffer
   * @param {string} mimeType
   * @param {Object} [options]
   * @returns {Promise<{ canonicalData: Object, rawText: string, evidences: Array<Object>, confidenceScore: number }>}
   */
  async parse(buffer, mimeType, options = {}) {
    throw new Error('ResumeParserProvider.parse must be implemented');
  }
}

module.exports = ResumeParserProvider;
