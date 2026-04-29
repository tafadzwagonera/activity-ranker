import pino from 'pino';

export const backendLogger = pino({
  base: undefined,
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    censor: '[REDACTED]',
    paths: [
      'req.headers.authorization',
      'req.headers.xapikey',
      'req.headers.xinternalkey',
      'request.headers.authorization',
      'request.headers.xapikey',
      'request.headers.xinternalkey',
    ],
  },
});
