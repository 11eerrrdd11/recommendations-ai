const functions = require('firebase-functions');
const fetch = require("node-fetch");
const cors = require('cors')({origin: functions.config().shopify.url});


exports.getRecommendations = functions.https.onRequest((request, response) => {
    // use cors to prevent requests from websites other than the client's shopify domain
    cors(request, response, async () => {
        try {
            functions.logger.log(`User requested recs`);
            const { payload, placement } = request.body;
            const apiKey = functions.config().recs.predict_key;
            const projectId = process.env.GCLOUD_PROJECT;
            const url = `https://recommendationengine.googleapis.com/v1beta1/projects/${projectId}/locations/global/catalogs/default_catalog/eventStores/default_event_store/placements/${placement}:predict?key=${apiKey}`;
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

exports.logUserEvent = functions.https.onRequest((request, response) => {
    // use cors to prevent requests from websites other than the client's shopify domain
    cors(request, response, async () => {
        try {
            functions.logger.log(`Logging user event`);
            const event = request.body;
            const apiKey = functions.config().recs.event_key;
            const projectId = process.env.GCLOUD_PROJECT;
            const url = `https://recommendationengine.googleapis.com/v1beta1/projects/${projectId}/locations/global/catalogs/default_catalog/eventStores/default_event_store/userEvents:write?key=${apiKey}`
            functions.logger.log(`Requesting predictions from ${url}`);
    
            const result = await fetch(url, { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
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

exports.updateProductCatalog = functions.pubsub.schedule('every 15 minutes').onRun((context) => {
    console.log('Updating product catalog');

    // TODO: download product data from Shopify Admin

    // convert to valid json format

    // import to Recommendations Ai
    return null;
});
