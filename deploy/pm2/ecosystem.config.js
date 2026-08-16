// pm2 process definition for the Eclipse Motors Node app on the VPS.
// Start:  pm2 start deploy/pm2/ecosystem.config.js && pm2 save
// The app reads DATABASE_URL / SESSION_SECRET / UPLOAD_DIR from /var/www/CarLab/.env
module.exports = {
  apps: [
    {
      name: "eclipse-motors",
      cwd: "/var/www/CarLab",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        // Bind to loopback only. nginx proxies to 127.0.0.1:3001, so there is
        // no reason for this process to answer on a public interface — and on
        // the old server every app listening on 0.0.0.0 was the most likely
        // way the box was compromised.
        HOSTNAME: "127.0.0.1",
      },
      instances: 1,
      autorestart: true,
      // Raised from 500M. This app carries sharp, playwright and
      // onnxruntime-node; 500M was the tightest ceiling of the eleven apps on
      // the box and it had restarted more often than any of them (5 times vs
      // 0-2 elsewhere). A ceiling low enough to trip during normal work turns
      // a slow request into an outage.
      max_memory_restart: "1G",
    },
  ],
};
