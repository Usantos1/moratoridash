module.exports = {
  apps: [
    {
      name: "muratori-api",
      script: "apps/api/start.js",
      cwd: "/var/www/muratori",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
