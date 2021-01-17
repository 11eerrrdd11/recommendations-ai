const functions = require('firebase-functions');
const admin = require('firebase-admin');
const PROJECT_ID = process.env.GCLOUD_PROJECT;
const fetch = require("node-fetch");
const crypto = require("crypto");
const WEBHOOK_SECRET = functions.config().shopify.webhook_secret;

exports.getAccessTokenAsync = async () => {
    const scopes = "https://www.googleapis.com/auth/cloud-platform"
    const url = `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=${scopes}`
    const result = await fetch(url, {
        headers: {
            "Metadata-Flavor": "Google"
        },
    });
    const status = result.status;
    functions.logger.log(`Call to get token has status ${status}`);
    const data = await result.json()
    functions.logger.log(`Call to get token has data ${JSON.stringify(data)}`);
    const accessToken = data.access_token;
    if (accessToken === null){
        throw new Error(`Failed to retrieve access token`);
    }
    return accessToken;
}

exports.logUserEventAsync = async (user_event) => {
    functions.logger.log(`event ${JSON.stringify(user_event)}`);
    const apiKey = functions.config().recs.event_key;
    const url = `https://recommendationengine.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/global/catalogs/default_catalog/eventStores/default_event_store/userEvents:write?key=${apiKey}`
    functions.logger.log(`Logging user event to ${url}`);

    const result = await fetch(url, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user_event)
    });
    return result;
}

exports.webhookRequestFromShopify = (request) => {
    const hmac = request.get('X-Shopify-Hmac-Sha256')
    const body = request.rawBody;
    const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body, 'utf8', 'hex')
    .digest('base64')
    if (hash === hmac) {
        return true;
    } else {
        return false;
    }
}

exports.getUserFromCartAsync = async (cartId) => {
    functions.logger.log(`Retrieving clientId for cart ${cartId}`);
    const queryRef = admin.firestore().collection('clients').where('cartIds', 'array-contains', cartId).limit(1);
    const snapshot = await queryRef.get();
    if (snapshot.empty) {
        // TODO: retry querying document for 10s to deal with synchronicity issues
        throw new Error(`Relationship between cart and client not in firestore`);
    } else {
        var clientId;
        var userId;
        var experimentId;
        snapshot.forEach(doc => {
            clientId = doc.id;
            var docData = doc.data();
            userId = docData.userId;
            experimentId = docData.experimentVariationId;
        });
        if (clientId === null){
            throw new Error(`Client Id is null`);
        }
        functions.logger.log(`Retrieved clientId=${clientId} userId=${userId} experimentId:${experimentId}`);
        return [clientId, userId, experimentId];
    }
}

exports.parseLineItems = function(lineItems) {
    return lineItems.map((item) => {
        return {
            id: `${item.product_id }`,
            currencyCode: item.price_set.presentment_money.currency_code,
            originalPrice: item.price,
            displayPrice: item.price,
            quantity: item.quantity
        };
    });
}