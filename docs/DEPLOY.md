# Deploying EPFO One on AWS EC2

**Status: live.** Deployed at **https://epfo.ultrahuman.co.in** — Docker Hub
+ a single EC2 box + Caddy for automatic HTTPS. Full CI/CD is wired: every
push to `main` builds both images, pushes them to Docker Hub, then SSHes
into the EC2 box and restarts the stack on the new images (see
`.github/workflows/docker-publish.yml`).

This doc is the runbook for reproducing that setup (or doing it again on a
fresh box) — it now reflects the exact steps that were actually run and
verified, not a plan.

## 0. What you needed

- An AWS account (EC2, console access).
- A Docker Hub account + access token.
- A domain with DNS you control (used here: `ultrahuman.co.in` on GoDaddy,
  pointed via a subdomain — see step 2 for why a subdomain, not the root).
- A GitHub fine-grained personal access token (Contents + Secrets,
  read/write, scoped to just this repo) — only needed once, to push and to
  set the Actions secrets below; safe to revoke after.

## 1. Launch the EC2 instance

- AMI: **Ubuntu** (26.04 LTS in this deployment; 22.04 works identically).
- Instance type: **t3.small** minimum. Postgres + the API + Next.js
  together are tighter than t2/t3.micro's 1 GB RAM comfortably allows.
- Security group — end state, after fixing the console wizard's default:
  - `22/tcp` (SSH) — restricted to a single known IP, **not** `0.0.0.0/0`.
    The wizard defaults to open-to-the-world; always narrow this before
    leaving an instance running.
  - `80/tcp` and `443/tcp` from `0.0.0.0/0` — Caddy needs both (80 for the
    Let's Encrypt HTTP-01 challenge, 443 for the site itself).
- Key pair: whichever `.pem`/key you use to SSH in as `ubuntu`.

## 2. Point your domain at the instance

**Use a subdomain (e.g. `epfo.yourdomain.com`), not the root domain**,
unless you're certain the root isn't serving anything else. In this
deployment the root domain (`ultrahuman.co.in`) already had other DNS
records tied to a live email-sending setup (SPF/DKIM/DMARC, MX) — the site
is on `epfo.ultrahuman.co.in` specifically so none of that was touched.

Add an **A record**: Name `epfo` (or whatever subdomain), Value = the
instance's public IP. Caddy needs this to resolve before it can get a
certificate — check with `dig +short epfo.yourdomain.com A`, or query the
registrar's authoritative nameserver directly to bypass local DNS caching
while waiting: `dig @<ns from your registrar> +short <domain> A`.

## 3. Install Docker on the instance

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
```

Docker Compose v2 ships as the `docker compose` plugin with that install
script.

## 4. Get the code onto the instance

Either `git clone <repo-url> ~/epfo-one`, or (what was actually done here,
to deploy the same night code was written, before it was pushed) `rsync`
the local working tree straight to the box. Either way you end up with
`~/epfo-one` containing `docker-compose.prod.yml`, `Caddyfile`,
`.env.prod.example`, and the app source (source is needed here because
images are built ON the box — see step 5's note on architecture).

```bash
cp .env.prod.example .env.prod
```

Edit `.env.prod`:

```
DOCKERHUB_USERNAME=<your docker hub username>
DOMAIN=epfo.yourdomain.com
POSTGRES_USER=epfo
POSTGRES_PASSWORD=<generate one — openssl rand -base64 24>
POSTGRES_DB=epfo_one
OPENAI_API_KEY=<blank until that layer exists>
```

## 5. Build and push the images

**Architecture note:** if you're building from an Apple Silicon Mac, the
images come out `arm64` — incompatible with a standard (x86_64) EC2
instance. Building directly on the box (which is x86_64) sidesteps this
entirely without needing `buildx`/QEMU cross-compilation. That's what was
done for the first deploy; the CI workflow builds on GitHub's own
`ubuntu-latest` runners (also x86_64) for every push after that.

```bash
docker login -u <username>   # or --password-stdin with a token, non-interactively
cd ~/epfo-one
docker build -f apps/api/Dockerfile -t <username>/epfo-one-api:latest .
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://epfo.yourdomain.com/trpc \
  -t <username>/epfo-one-web:latest .
docker push <username>/epfo-one-api:latest
docker push <username>/epfo-one-web:latest
```

## 6. First run

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

(No `pull` needed the very first time — the images just built are already
present locally with matching tags.)

Check Caddy got the certificate: `docker logs <project>-caddy-1 --tail 20`
should show `"certificate obtained successfully"`. If it shows DNS
`NXDOMAIN` errors instead, DNS hasn't propagated yet — Caddy retries every
60s on its own, no restart needed once DNS catches up.

## 7. Migrate and seed the database — tested, real command

The api image already contains the full pruned `packages/database`
workspace (source, `drizzle-kit`, `tsx`, and the compiled migration SQL),
since `turbo prune @repo/api` pulls in every workspace package it depends
on transitively. Run migrations and seed from inside the running
`api` container, pointed at the `postgres` service by its Docker network
name:

```bash
docker exec -w /app/packages/database <project>-api-1 sh -c \
  'DATABASE_URL=postgresql://<user>:<password>@postgres:5432/<db> \
   node_modules/.bin/drizzle-kit migrate --config=drizzle.config.ts'

docker exec -w /app/packages/database <project>-api-1 sh -c \
  'DATABASE_URL=postgresql://<user>:<password>@postgres:5432/<db> \
   node_modules/.bin/tsx seed.ts'
```

(`drizzle-kit` and `tsx` live under `packages/database/node_modules/.bin`,
not the workspace root's — pnpm doesn't hoist them there in this repo.)

Verify with a real request before trusting it:

```bash
docker exec <project>-api-1 node -e \
  "fetch('http://localhost:8000/trpc/auth.requestOtp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({uan:'100234567890'})}).then(r=>r.text()).then(console.log)"
```

A `{"result":{"data":{"requested":true,"devOtp":"..."}}}` response means
the API is genuinely talking to a migrated, seeded Postgres — not just
that the container is running.

## 8. CI/CD — set up once, then automatic

`.github/workflows/docker-publish.yml` builds both images and pushes them
to Docker Hub on every push to `main`, then SSHes into the box, `git
pull`s, pulls the fresh images, and runs `up -d`. Five repo secrets make
this work:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token (not the account password) |
| `NEXT_PUBLIC_API_URL` | `https://epfo.yourdomain.com/trpc` — baked into the web build at build time |
| `EC2_HOST` | the instance's public IP |
| `EC2_SSH_KEY` | a **deploy-only** SSH private key — see below |

**On the SSH key:** generate a fresh key pair specifically for this
workflow rather than reusing a personal one — `ssh-keygen -t ed25519 -f
deploy_key -N ""`, add `deploy_key.pub` to the box's
`~ubuntu/.ssh/authorized_keys`, and put `deploy_key`'s contents (the
private half) in the `EC2_SSH_KEY` secret. A personal key is usually
shared across multiple servers; if it ends up in a CI secret and that
secret ever leaks, every server using that key is exposed, not just this
one. A dedicated key limits the blast radius to this one deployment.

Once the secrets are set, `git push` to `main` is the entire deploy
process — no manual step on the box required.

## Rollback

Every image is also tagged with the git SHA (see the workflow), so a bad
`:latest` can be rolled back by pointing `docker-compose.prod.yml`'s
`image:` lines at a specific `<username>/epfo-one-web:<sha>` tag and
re-running `up -d` on the box.
