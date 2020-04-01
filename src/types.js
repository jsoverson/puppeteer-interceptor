// https://chromedevtools.github.io/devtools-protocol/tot/Network#type-ErrorReason
exports.ERROR_REASON = {
  "FAILED": "Failed",
  "ABORTED": "Aborted",
  "TIMEDOUT": "TimedOut",
  "ACCESS_DENIED": "AccessDenied",
  "CONNECTION_CLOSED": "ConnectionClosed",
  "CONNECTION_RESET": "ConnectionReset",
  "CONNECTION_REFUSED": "ConnectionRefused",
  "CONNECTION_ABORTED": "ConnectionAborted",
  "CONNECTION_FAILED": "ConnectionFailed",
  "NAME_NOT_RESOLVED": "NameNotResolved",
  "INTERNET_DISCONNECTED": "InternetDisconnected",
  "ADDRESS_UNREACHABLE": "AddressUnreachable",
  "BLOCKED_BY_CLIENT": "BlockedByClient",
  "BLOCKED_BY_RESPONSE": "BlockedByResponse"
}


// https://chromedevtools.github.io/devtools-protocol/tot/Network#type-ResourceType
exports.RESOURCE_TYPE = [
  'Document',
  'Stylesheet',
  'Image',
  'Media',
  'Font',
  'Script',
  'TextTrack',
  'XHR',
  'Fetch',
  'EventSource',
  'WebSocket',
  'Manifest',
  'SignedExchange',
  'Ping',
  'CSPViolationReport',
  'Other',
];
