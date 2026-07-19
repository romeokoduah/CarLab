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
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
    },
  ],
};
