module.exports = {
  apps: [
    {
      name: 'drawing-giveaway',
      script: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Restart settings
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // Logging - use environment variables for customization
      // PM2_LOG_DATE_FORMAT, PM2_ERROR_LOG_PATH, PM2_OUT_LOG_PATH can override these
      log_date_format: process.env.PM2_LOG_DATE_FORMAT || 'YYYY-MM-DD HH:mm:ss Z',
      error_file: process.env.PM2_ERROR_LOG_PATH || '/dev/stderr',
      out_file: process.env.PM2_OUT_LOG_PATH || '/dev/stdout',
      merge_logs: true,
    },
  ],
}
