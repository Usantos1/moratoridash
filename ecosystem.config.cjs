module.exports = {
  apps: [
    {
      name: "muratori-api",
      script: "apps/api/dist/server.js",
      cwd: "/var/www/muratori",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      // Carrega variáveis do .env da raiz (PM2 5.2+)
      env_file: "/var/www/muratori/.env",
    },
  ],
};
