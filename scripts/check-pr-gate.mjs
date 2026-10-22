const required = ['quality', 'test', 'build', 'security'];

try {
  const results = JSON.parse(process.env.JOB_RESULTS || 'null');
  const failed = required.filter(
    (name) => results?.[name]?.result !== 'success',
  );
  if (failed.length)
    throw new Error(`Required jobs did not succeed: ${failed.join(', ')}`);
  process.stdout.write('PR Gate: every required job succeeded.\n');
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : 'Invalid job results'}\n`,
  );
  process.exitCode = 1;
}
