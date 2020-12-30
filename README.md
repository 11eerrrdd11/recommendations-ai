# Recommendations Ai

## Prerequisites

- Install Google Cloud Platform CLI and authenticate

## GCP setup

- Create and enable a new project

```bash
    export PROJECT_ID=recommendations-ai-1234
    gcloud projects create ${PROJECT_ID} --name recommendations-ai 
    gcloud config set project ${PROJECT_ID}
```

- Link a billing account
- Enable the recommendations api

```bash
    gcloud services enable recommendationengine.googleapis.com
```

- Create a service account key so your application can interact with the catalogue API (TODO: add required permissions)

```bash
    export SERVICE_ACCOUNT_NAME=recommendations
    gcloud iam service-accounts create ${SERVICE_ACCOUNT_NAME}

    gcloud iam service-accounts keys create ~/key.json --iam-account ${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com
```

- Create an API key to log user events (TODO - use cli or api call)

```bash

```

- Create a separate API key to request predictions (TODO - not working)

```bash
    export PREDICTIONS_API_KEY=AIzaSyC4Z2hz21QcoxrU9vA7sCRbK9MY5oQn7Qc
    curl -X POST -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json; charset=utf-8" --data "{"predictionApiKeyRegistration": {"apiKey": '${PREDICTIONS_API_KEY}'}}" "https://recommendationengine.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/global/catalogs/default_catalog/eventStores/default_event_store/predictionApiKeyRegistrations"
```


## Add shopify products to the recommendations Ai catalog

- Export products from shopify dashboard to simple csv and move to `./data/products_export_1.csv`
- Generate a json file of parsed product info

```bash
    python add_products.py
```

- Upload the products to bigquery

```bash
    bq mk catalog
    bq load --replace --source_format=NEWLINE_DELIMITED_JSON catalog.products ./data/preprocessed_products.json ./recommendations_ai_schema.json
```

- Set catalog level (TODO: not working)

```bash
curl -X PATCH -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "Content-Type: application/json; charset=utf-8" --data "{"catalogItemLevelConfig": {"eventItemLevel": "MASTER","predictItemLevel":"MASTER"}" "https://recommendationengine.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/global/catalogs/default_catalog/eventStores/default_event_store/predictionApiKeyRegistrations"
```

- Set up a scheduler job to import products from Bigquery to recommednations AI every 0th minute of every hour

```bash
gcloud scheduler --project recommendations-ai-1234 \
jobs create http import_catalog_ip0ghe1truc1 \
--time-zone='America/Los_Angeles' \
--schedule='0 0 * * *' \
--uri='https://recommendationengine.googleapis.com/v1beta1/projects/39575376907/locations/global/catalogs/default_catalog/catalogItems:import' \
--description='Import Recommendations AI catalog data' \
--headers='Content-Type: application/json; charset=utf-8' \
--http-method='POST' \
--message-body='{"inputConfig":{"bigQuerySource":{"projectId":"recommendations-ai-1234","datasetId":"catalog","tableId":"products","dataSchema":"catalog_recommendations_ai"}}}' \
--oauth-service-account-email='recs-515@recommendations-ai-1234.iam.gserviceaccount.com'
```



## ToDo

### Product Catalog

- Add required catalog fields
    - correctly add category heirarchies
- Add optional catalog fields
    - https://cloud.google.com/recommendations-ai/docs/catalog#required-fields
- Include custom feature maps per customer
- Use shopify python client for robust product download
- Use GCP python client library for robust product upload - https://googleapis.dev/python/recommendationengine/latest/index.html
- Schedule product catalog updates with cloud scheduler

### 