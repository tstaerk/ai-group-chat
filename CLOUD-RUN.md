# Deploy to Google Cloud Run in Frankfurt

This deployment runs a Cloud Run **service** with one minimum instance and CPU always allocated. That keeps the outbound Discord Gateway connection active without incoming HTTP requests. The HTTP endpoint is private and exists for startup health checks. Discord does not need the service URL.

Continuous instance billing applies, along with Gemini usage and build/storage charges. This is not a scale-to-zero deployment. See [Cloud Run billing](https://docs.cloud.google.com/run/docs/configuring/billing-settings) and [pricing](https://cloud.google.com/run/pricing).

## Prepare

Use Google Cloud Shell (Bash) for the following commands. Clone the repository in Cloud Shell and `cd` into the folder containing `Dockerfile`. No local Docker installation is required.

Select your intended project with billing enabled. Replace the placeholder; do not use a project just because it happens to be your CLI default.

```bash
export PROJECT_ID="YOUR_PROJECT_ID"
export REGION="europe-west3"
export SERVICE="discord-ai-peer"
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
gcloud iam service-accounts create discord-ai-peer --display-name="Discord AI Peer"
export BOT_SA="discord-ai-peer@${PROJECT_ID}.iam.gserviceaccount.com"
```

Your deploying account needs permission to build/deploy Cloud Run, act as this service account, create secrets and grant access. Organization policies can require additional build permissions; follow any specific gcloud error rather than granting broad Editor access.

## Store the two secrets

The commands prompt without echoing the values or placing them in shell history. If these secret names already exist, use `gcloud secrets versions add ... --data-file=-` instead of `create`.

```bash
read -rs -p "Discord bot token: " DISCORD_TOKEN; echo
printf '%s' "$DISCORD_TOKEN" | gcloud secrets create discord-bot-token --replication-policy=automatic --data-file=-
unset DISCORD_TOKEN
read -rs -p "Gemini API key: " GEMINI_API_KEY; echo
printf '%s' "$GEMINI_API_KEY" | gcloud secrets create discord-gemini-key --replication-policy=automatic --data-file=-
unset GEMINI_API_KEY

for SECRET in discord-bot-token discord-gemini-key; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:${BOT_SA}" --role=roles/secretmanager.secretAccessor
done
```

## Configure and deploy

```bash
cp cloudrun.env.example.yaml cloudrun.env.yaml
nano cloudrun.env.yaml
```

Replace the channel placeholder. Use a quoted comma-separated list for multiple channels/threads. Leave credentials out of this YAML.

```bash
gcloud run deploy "$SERVICE" \
  --project="$PROJECT_ID" --region="$REGION" --source=. \
  --service-account="$BOT_SA" \
  --no-allow-unauthenticated \
  --no-cpu-throttling --cpu=1 --memory=512Mi \
  --min=1 --max=1 --max-instances=1 \
  --env-vars-file=cloudrun.env.yaml \
  --set-secrets=DISCORD_TOKEN=discord-bot-token:1,GEMINI_API_KEY=discord-gemini-key:1 \
  --startup-probe=httpGet.path=/healthz,httpGet.port=8080,periodSeconds=5,timeoutSeconds=2,failureThreshold=24
```

Secrets are pinned to version 1 for repeatable deployment. When rotating credentials, replace those numbers with the new versions. Source deployment builds using the included Dockerfile; `.env` files are excluded from source upload and the image.

## Verify

```bash
gcloud run services logs read "$SERVICE" --region="$REGION" --limit=50
gcloud run services describe "$SERVICE" --region="$REGION"
```

Look for `Online as ...`, then mention the bot in your allowed Discord channel. Confirm exactly one response. Do not run the local bot simultaneously. If startup health checks fail, inspect token, Message Content Intent, outbound connection and logs. Do not set Discord's Interactions Endpoint URL: this bot listens through the Gateway.

## Updates and limitations

Cloud Run can restart instances; discord.js reconnects automatically while the process is alive. Context is fetched again from Discord, but reset cutoffs and cooldowns are in memory and disappear at restart.

The instance limits reduce duplicates but are not a distributed singleton guarantee: deployments and infrastructure replacement can briefly overlap instances. This starter has no shared lease or event deduplication. Avoid traffic splits and revision tags. For a small friends' group, stop the service before redeploying if duplicate replies during an update are unacceptable (a short outage results):

```bash
gcloud run services update "$SERVICE" --region="$REGION" --scaling=0
# Wait until the old instance stops, then deploy the new source using the command above,
# adding --scaling=auto to restore autoscaling with the configured min/max limits.
```

To remove the running service and stop its compute charges:

```bash
gcloud run services delete "$SERVICE" --region="$REGION"
```

Build images and secrets remain and may have storage charges; manage them separately. Google also offers [Cloud Run worker pools](https://docs.cloud.google.com/run/docs/overview/what-is-cloud-run) for non-HTTP background workers; this package uses the established Cloud Run service deployment path.
