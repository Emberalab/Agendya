// The reminders cron otherwise fires on its own 15-minute schedule and can race
// serializable booking transactions in the e2e suite (both touch the same rows).
process.env.DISABLE_SCHEDULED_JOBS = 'true';
