const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logUserEventAsync } = require("./helpers");
const cors = require('cors')({origin: functions.config().shopify.url});
const PROJECT_ID = process.env.GCLOUD_PROJECT;
const fetch = require("node-fetch");
const {webhookRequestFromShopify, getUserFromCartAsync, parseLineItems} = require('./helpers')
const optimizely = require('@optimizely/optimizely-sdk');
const optimizelyClientInstance = optimizely.createInstance({
    sdkKey: functions.config().optimizely.sdk_key,
});


// Save which cart belongs to which user for use in cartUpdated webhook
exports.saveClientId = functions.https.onRequest((request, response) => {
    // use cors to prevent requests from websites other than the client's shopify domain
    cors(request, response, async () => {
        try {
            const { clientId, userId, cartId, experimentVariationId } = request.body;
            functions.logger.log(`clientId:${clientId} userId:${userId} cartId:${cartId} experimentVariationId:${experimentVariationId}`);

            // add the relationship between clientIds and carts to firestore
            const docRef = admin.firestore().collection('clients').doc(clientId);
            await docRef.set({
                userId: userId,
                cartIds: admin.firestore.FieldValue.arrayUnion(cartId),
                experimentVariationId: experimentVariationId,
            }, { merge: true});

            response.status(200).send({})
            return
        }
        catch(error){
            console.log(error)
            response.status(500).send(error)
            return
        }
    })
});

exports.getRecommendations = functions.https.onRequest((request, response) => {
    // use cors to prevent requests from websites other than the client's shopify domain
    cors(request, response, async () => {
        try {
            functions.logger.log(`User requested recs`);
            const { payload, placement } = request.body;
            const apiKey = functions.config().recs.predict_key;
            const url = `https://recommendationengine.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/global/catalogs/default_catalog/eventStores/default_event_store/placements/${placement}:predict?key=${apiKey}`;
            functions.logger.log(`Requesting predictions from ${url}`);
    
            const result = await fetch(url, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const status = result.status;
            functions.logger.log(`Call to recs API returned status ${status}`);
            response.status(status)
            const data = await result.json()
            response.send(data)
            return
        }
        catch(error){
            console.log(error)
            response.status(500).send(error)
            return
        }
    })
});

const logOptimizelyPurchaseEvent = async (amount, currency, visitorId) => {
    functions.logger.log(`Logging optimizely order-paid event for user ${visitorId}: ${amount} ${currency}`);
    return optimizelyClientInstance.onReady({ timeout: 15000 }).then(async (result) => {
        if (result.success === false){
            throw new Error(`Failed to instantiate optimizely client: ${result.reason}`);
        }
        const floatAmount = parseFloat(amount);
        functions.logger.log(`Float amount=${floatAmount}`);

        // convert amount into cents
        const exchangeResult = await fetch('https://api.exchangeratesapi.io/latest?base=USD', { 
            method: 'GET',
        });
        const status = exchangeResult.status;
        functions.logger.log(`Call to exchange rates API returned status ${status}`);
        if (status !== 200){
            throw new Error(`Failed to retrieve exchange rates`);
        }
        const data = await exchangeResult.json()
        functions.logger.log(`Exhcange rates=${JSON.stringify(data)}`);
        const exchangeRate = data.rates[currency];
        functions.logger.log(`Exhcange rate=${exchangeRate}`);
        const amountInDollars = floatAmount / exchangeRate;
        if (amountInDollars === null){
            throw new Error(`Failed to convert ${amount} ${currency} into dollars.`);
        }
        functions.logger.log(`Amount in dollars = ${amountInDollars}`);
        const amountInCents = amountInDollars * 100;

        const attributes = {};
        const tags = {
            revenue: amountInCents
        };
        functions.logger.log(`${amount} ${currency} = ${amountInCents} cents`);
        functions.logger.log(`Logging order-paid to optimizely with tags: ${JSON.stringify(tags)}`);
        await optimizelyClientInstance.track("order-paid", visitorId, attributes, tags);
        return;
      });
}

exports.logUserEvent = functions.https.onRequest((request, response) => {
    // use cors to prevent requests from websites other than the client's shopify domain
    cors(request, response, async () => {
        try {
            functions.logger.log(`Logging user event`);
            const event = request.body;
            const result = await logUserEventAsync(event);
            const status = result.status;
            functions.logger.log(`Call to recs API returned status ${status}`);
            response.status(status)
            const data = await result.json()
            response.send(data)
            return
        }
        catch(error){
            console.log(error)
            response.status(500).send(error)
            return
        }
    })
});

// Log purchase events
exports.orderPaid = functions.https.onRequest(async (request, response) => {

    const fromShopify = webhookRequestFromShopify(request);
    if (fromShopify === false){
        functions.logger.log(`This request didn't originate from Shopify`)
        response.status(403).send();
    }
    
    try {
        const order = request.body;
        console.log(JSON.stringify(order))

        // retrieve the clientId and customerId from the cart document
        const cartId = order.cart_token;
        if (cartId === null){
            functions.logger.log(`CartId not in order. Cannot log events.`);
            response.status(200).send();
            return
        } 
        const [clientId, userId, experimentId] = await getUserFromCartAsync(cartId);
        functions.logger.log(`Order is for clientId=${clientId} & uid=${userId}`);

        // log the event to recommendations Ai
        const items = order.line_items;
        const productDetails = parseLineItems(items);
        const userEvent = {
            "eventType": "purchase-complete",
            "userInfo": {
              "visitorId": `${clientId}`, // unique across browser sessions
              "userId": `${userId}`, // unique across browser sessions
            },
            "eventDetail": {
              "experimentIds": experimentId
            },
            "productEventDetail": {
              "cartId" : `${cartId}`,
              "productDetails": productDetails,
              "purchaseTransaction": {
                    "id": `${order.id}`,
                    "revenue": `${order.total_price}`,
                    // "taxes": {"state": 3.4, "local": 0.41},
                    // "costs": {"manufacturing": 45.5, "cost": 12.4},
                    "currencyCode": `${order.currency}`,
               }
            },
            "eventTime": order.updated_at,
        }
        const recsEventPromise = logUserEventAsync(userEvent);
        const optimizelyEventPromise = logOptimizelyPurchaseEvent(order.total_price, order.currency, `${clientId}`);
        await Promise.all([recsEventPromise, optimizelyEventPromise]);
        response.status(200).send()
        return
    }
    catch(error){
        functions.logger.error(error)
        response.status(500).send(error)
        return
    }
});
