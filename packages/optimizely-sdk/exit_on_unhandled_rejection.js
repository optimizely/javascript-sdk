process.on("unhandledRejection", function(err) {
  console.error('Unhandled promise rejection');
  if (err) {
    console.error(err);
  }
  process.exit(1);
});
