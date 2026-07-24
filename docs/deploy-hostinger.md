# Deploy Muratori Dash — Hostinger KVM2

Guia para rodar **Postgres nativo + API Node** na VPS KVM2 da Hostinger.

## 1. Provisionar a VPS

1. Painel Hostinger → VPS → criar/acessar KVM2
2. SO recomendado: **Ubuntu 24.04 LTS**
3. Anote: IP público, usuário `root` (ou sudo), senha/SSH key

Conecte:

```bash
ssh root@SEU_IP
```

## 2. Hardening básico

```bash
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban

# Firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 3. Instalar Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v && npm -v
```

## 4. Instalar PostgreSQL 16

```bash
apt install -y postgresql postgresql-contrib
systemctl enable --now postgresql

# Usuário e banco da aplicação
sudo -u postgres psql <<'SQL'
CREATE USER muratori WITH PASSWORD 'TROQUE_SENHA_FORTE_AQUI';
CREATE DATABASE muratori_dash OWNER muratori;
GRANT ALL PRIVILEGES ON DATABASE muratori_dash TO muratori;
\c muratori_dash
GRANT ALL ON SCHEMA public TO muratori;
SQL
```

Teste:

```bash
psql "postgresql://muratori:TROQUE_SENHA_FORTE_AQUI@127.0.0.1:5432/muratori_dash" -c 'SELECT 1'
```

> Em produção o Postgres escuta só em `127.0.0.1` (padrão). A API na mesma VPS conecta via localhost.

## 5. Clonar o projeto

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/Usantos1/moratoridash.git muratori
cd muratori
npm install
```

## 6. Ambiente de produção

Crie o `.env` na raiz (sem nano):

```bash
cd /var/www/muratori

cat > .env <<'EOF'
NODE_ENV=production
API_HOST=127.0.0.1
API_PORT=3340
CORS_ORIGIN=https://app.muratorimkt.com.br
DATABASE_URL=postgresql://muratori:SUA_SENHA_URL_ENCODED@127.0.0.1:5432/muratori_dash?schema=public
JWT_SECRET=gere-um-secret-longo-aleatorio-aqui
ADMIN_EMAIL=time@muratorimkt.com.br
ADMIN_PASSWORD=SenhaAdminForte!
EOF
```

> **Importante:** se a senha do Postgres tiver caracteres especiais (`&`, `;`, `@`, `#`, `%`, etc.), ela **precisa ir URL-encoded** dentro do `DATABASE_URL`.  
> Ex.: `&` → `%26` · `;` → `%3B` · `@` → `%40` · `#` → `%23`
>
> **Nunca** cole senhas reais neste arquivo de documentação nem no Git.

## 7. Migrations + seed

O Prisma lê o `.env` da raiz via `dotenv-cli`. Rode:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

Se ainda der `DATABASE_URL` not found (versão antiga do repo sem dotenv-cli), force o env:

```bash
set -a && . ./.env && set +a
npm run db:migrate:deploy
npm run db:seed
```

### Migration de workspaces (multi-tenant)

A migration `20260724200000_workspaces_rbac` transforma a instalação em multi-tenant sem perder
dados: cria o workspace `muratori`, os cargos padrão (Owner, Administrador, Editor, Comercial,
Leitor), vincula os usuários existentes como Owner e faz backfill de `workspace_id` em todos os
dados (Smart Forms, leads, settings, páginas, fluxos, ofertas e domínios).

Os usuários que estavam com `role` `owner`/`admin` passam a `superadmin` da plataforma — eles
enxergam todos os workspaces. Novos usuários criados pelo painel nascem como `member` e só acessam
os workspaces onde têm membership.

Depois do deploy, valide o isolamento com o smoke test (API precisa estar no ar):

```bash
node scripts/smoke-workspaces.mjs
```

## 8. Build + PM2

```bash
npm run build
npm install -g pm2

pm2 start apps/api/dist/server.js --name muratori-api
pm2 save
pm2 startup
```

Verifique:

```bash
curl http://127.0.0.1:3340/health
curl http://127.0.0.1:3340/health/db
```

## 9. Nginx + SSL (API + frontend)

Com o front buildado (`apps/web/dist`), o Nginx serve o SPA e faz proxy da API:

```bash
cd /var/www/muratori
npm run build:web

cat >/etc/nginx/sites-available/muratori-api <<'NGINX'
server {
    listen 80;
    server_name app.muratorimkt.com.br;
    root /var/www/muratori/apps/web/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3340;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:3340;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

nginx -t && systemctl reload nginx
```

SSL (se ainda não tiver):

```bash
certbot --nginx -d app.muratorimkt.com.br --non-interactive --agree-tos -m time@muratorimkt.com.br --redirect
```

No `.env` da API, inclua o domínio no CORS:

```env
CORS_ORIGIN=https://app.muratorimkt.com.br,http://localhost:5173
```

Depois: `pm2 restart muratori-api`

## 10. Atualizar (deploy)

```bash
cd /var/www/muratori
git fetch origin
git reset --hard origin/main

# deps de build (Prisma/tsc) precisam de devDeps
unset NODE_ENV
npm install --include=dev
set -a && . ./.env && set +a

npm run db:generate
npm run db:migrate:deploy
npm run db:seed

npm run build
pm2 restart muratori-api --update-env
```

Uploads de logo/wallpaper do Smart Forms ficam em `apps/api/uploads/` (ou `uploads/` relativo ao cwd do PM2).  
Opcional no `.env`:

```env
PUBLIC_APP_URL=https://app.muratorimkt.com.br
SMART_FORM_CNAME_TARGET=app.muratorimkt.com.br
```

Nginx já faz proxy de `/api/` — imagens em `/api/uploads/:file` passam pela API.
## Backup do Postgres

```bash
# Cron diário às 3h
mkdir -p /var/backups/muratori
crontab -e
# adicione:
# 0 3 * * * pg_dump -U muratori muratori_dash | gzip > /var/backups/muratori/$(date +\%F).sql.gz
```

## Checklist Hostinger

- [ ] VPS KVM2 Ubuntu 24.04
- [ ] UFW: 22, 80, 443
- [ ] Postgres 16 local com usuário dedicado
- [ ] `.env` com `DATABASE_URL` apontando para `127.0.0.1`
- [ ] Migrations aplicadas
- [ ] PM2 rodando `muratori-api`
- [ ] Nginx + Let's Encrypt no subdomínio da API
- [ ] Backup diário configurado
