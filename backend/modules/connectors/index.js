const AdzunaConnector = require('./types/adzuna.connector');
const CustomCrawlerConnector = require('./types/customCrawler.connector');
const McaIndiaConnector = require('./types/mca_india.connector');
const GreenhouseConnector = require('./types/greenhouse.connector');
const ContactEnricherConnector = require('./types/contact_enricher.connector');
const YCombinatorConnector = require('./types/ycombinator.connector');

// Registry maps `sourceName` strings to their respective BaseConnector subclasses.
const ConnectorRegistry = {
  adzuna: AdzunaConnector,
  custom: CustomCrawlerConnector,
  mca_india: McaIndiaConnector,
  greenhouse: GreenhouseConnector,
  contact_enricher: ContactEnricherConnector,
  ycombinator: YCombinatorConnector
};

module.exports = ConnectorRegistry;
