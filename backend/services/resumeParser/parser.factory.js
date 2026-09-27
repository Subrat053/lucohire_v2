const InternalParserProvider = require('./internalParser.provider');
const FallbackParserProvider = require('./fallbackParser.provider');

let instance = null;

function getResumeParser(providerName = null) {
  const chosen = (providerName || process.env.RESUME_PARSER_PROVIDER || 'internal').toLowerCase().trim();

  if (chosen === 'fallback') {
    return new FallbackParserProvider();
  }

  if (!instance) {
    instance = new InternalParserProvider();
  }

  return instance;
}

module.exports = {
  getResumeParser,
};
