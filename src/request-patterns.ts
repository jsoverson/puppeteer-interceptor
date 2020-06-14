import Protocol from 'devtools-protocol';

export type PatternGenerator = {
  [key in Protocol.Network.ResourceType | 'All']: (patterns: string | string[]) => Protocol.Fetch.RequestPattern[];
};

export const patterns: PatternGenerator = {
  Document: patternGenerator('Document'),
  Stylesheet: patternGenerator('Stylesheet'),
  Image: patternGenerator('Image'),
  Media: patternGenerator('Media'),
  Font: patternGenerator('Font'),
  Script: patternGenerator('Script'),
  TextTrack: patternGenerator('TextTrack'),
  XHR: patternGenerator('XHR'),
  Fetch: patternGenerator('Fetch'),
  EventSource: patternGenerator('EventSource'),
  WebSocket: patternGenerator('WebSocket'),
  Manifest: patternGenerator('Manifest'),
  SignedExchange: patternGenerator('SignedExchange'),
  Ping: patternGenerator('Ping'),
  CSPViolationReport: patternGenerator('CSPViolationReport'),
  Other: patternGenerator('Other'),
  All: (patterns: string | string[]) =>
    toArray(patterns).map((pattern) => ({
      urlPattern: pattern,
      requestStage: 'Response',
    })),
};

function patternGenerator(type: string) {
  return (patterns: string | string[]) => toArray(patterns).map(toPattern(type));
}

function toArray(o: string | string[]) {
  return Array.isArray(o) ? o : [o];
}

function toPattern(type: string) {
  return (urlPattern: string) =>
    ({
      urlPattern,
      resourceType: type,
      requestStage: 'Response',
    } as Protocol.Fetch.RequestPattern);
}
