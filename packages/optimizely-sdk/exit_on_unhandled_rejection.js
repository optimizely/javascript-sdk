/*
 * This is to stop & fail tests when an unhandled promise rejection occurs.
 * See: https://nodejs.org/api/process.html#process_event_unhandledrejection
 */
process.on('unhandledRejection', function(err) {
  console.error('Unhandled promise rejection');
  if (err) {
    console.error(err);
  }
  process.exit(1);
});
