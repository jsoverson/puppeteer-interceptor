// https://chromedevtools.github.io/devtools-protocol/tot/Network#type-ErrorReason
export enum ERROR_REASON {
  FAILED = 'Failed',
  ABORTED = 'Aborted',
  TIMEDOUT = 'TimedOut',
  ACCESS_DENIED = 'AccessDenied',
  CONNECTION_CLOSED = 'ConnectionClosed',
  CONNECTION_RESET = 'ConnectionReset',
  CONNECTION_REFUSED = 'ConnectionRefused',
  CONNECTION_ABORTED = 'ConnectionAborted',
  CONNECTION_FAILED = 'ConnectionFailed',
  NAME_NOT_RESOLVED = 'NameNotResolved',
  INTERNET_DISCONNECTED = 'InternetDisconnected',
  ADDRESS_UNREACHABLE = 'AddressUnreachable',
  BLOCKED_BY_CLIENT = 'BlockedByClient',
  BLOCKED_BY_RESPONSE = 'BlockedByResponse',
}
