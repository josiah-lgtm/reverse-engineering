# Self-hosted deploy (Docker + nginx)

Serves **reverseengineering.agencyadvanta.com** from this Linux box instead of
Vercel. One Docker container serves the static SPA **and** the `/api/publish`
Notion function (same origin); host **nginx** terminates TLS and proxies to it.

```
internet ──▶ nginx :443 (TLS, host)
                 └─▶ 127.0.0.1:3001  Docker container
                                       ├─ /            static SPA  (dist/)
                                       └─ /api/publish Notion function
```

## Prerequisites (one time)

- A DNS **A record**: `reverseengineering.agencyadvanta.com` → this server's
  public IP. Confirm with `dig +short reverseengineering.agencyadvanta.com`.
- Docker Engine + the compose plugin:
  `curl -fsSL https://get.docker.com | sh`
- nginx + certbot:
  `sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx`
- The repo cloned on the server, e.g. `/opt/reverse-engineering`.

## 1. Configure secrets

```bash
cd /opt/reverse-engineering
cp .env.example .env
# edit .env: set NOTION_TOKEN and ONE of
#   NOTION_PARENT_DATABASE_ID  or  NOTION_PARENT_PAGE_ID
```

`.env` is gitignored — it never leaves the server.

## 2. Build & start the container

```bash
docker compose up -d --build
docker compose ps                 # should show "reverse-engineering" running
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3001/   # -> 200
```

## 3. Put nginx in front (one time)

```bash
sudo cp deploy/nginx/reverseengineering.agencyadvanta.com.conf \
        /etc/nginx/sites-available/reverseengineering.agencyadvanta.com
sudo ln -sf /etc/nginx/sites-available/reverseengineering.agencyadvanta.com \
            /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Enable HTTPS

```bash
sudo certbot --nginx -d reverseengineering.agencyadvanta.com
```

certbot adds the `443` block + http→https redirect and auto-renews via its
systemd timer (`systemctl list-timers | grep certbot`).

Open **https://reverseengineering.agencyadvanta.com** — including a deep link
like `/history` and the "Publish to Notion" modal (its connection check hits
`GET /api/publish`).

## Updating after new commits

```bash
./deploy/deploy.sh        # git pull + rebuild + restart, with a health wait
```

## Troubleshooting

- **App logs:** `docker compose logs -f app`
- **502 from nginx:** container down or not on `127.0.0.1:3001` —
  `docker compose ps`, then `docker compose up -d`.
- **Publish modal says "not connected":** `NOTION_TOKEN` / parent id missing or
  the integration isn't shared with the target page/db. `GET /api/publish`
  returns a JSON `hint` explaining which. Re-check `.env`, then
  `docker compose up -d` to reload it.
- **Port clash:** change `PORT` in `.env` and the `ports:` mapping in
  `docker-compose.yml`, plus `proxy_pass` in the nginx conf, then rebuild.
