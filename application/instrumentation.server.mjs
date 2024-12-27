import * as Sentry from "@sentry/remix";

Sentry.init({
    dsn: "https://8f41497ebd2a5c2c434592dde4e907a8@o4508491102879744.ingest.us.sentry.io/4508491340120064",
    tracesSampleRate: 1,
    autoInstrumentRemix: true
})