const TYPES = require('./types');

/**
 * Makes utility methods for ResourceTypes that take
 * url patterns and formats them into RequestPatterns
 * e.g.
 * patterns.Script('foo.js') which returns
 *  [{
 *   urlPattern: 'foo.js',
 *   resourceType: 'Script',
 *   requestStage: 'Response'
 * }]
 *
 */

const patterns = Object.fromEntries(
  TYPES.RESOURCE_TYPE.map(type => [type, patterns => toArray(patterns).map(toPattern('Script'))]),
);

patterns.All = patterns =>
  toArray(patterns).map(pattern => ({
    urlPattern: pattern,
    requestStage: 'Response',
  }));

function toArray(o) {
  return Array.isArray(o) ? o : [o];
}

function toPattern(type) {
  return urlPattern => ({
    urlPattern,
    resourceType: type,
    requestStage: 'Response',
  });
}

module.exports = patterns;
