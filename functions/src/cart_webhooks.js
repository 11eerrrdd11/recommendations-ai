const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {webhookRequestFromShopify} = require('./helpers')

exports.cartCreated = functions.https.onRequest(async (request, response) => {
    const fromShopify = webhookRequestFromShopify(request);
    if (fromShopify === false){
        functions.logger.log(`This request didn't originate from Shopify`)
        response.status(403).send();
    }
    try {
        const cart = request.body;
        const cartId = cart.id;
        functions.logger.log(`Cart ${cartId} updated`);
        const docRef = admin.firestore().collection('carts').doc(cartId)
        await docRef.set(cart, { merge: true });
        response.status(200).send()
        return
    } 
    catch(error){
        functions.logger.error(error)
        response.status(500).send(error)
        return
    }
});

exports.cartUpdated = functions.https.onRequest(async (request, response) => {
    const fromShopify = webhookRequestFromShopify(request);
    if (fromShopify === false){
        functions.logger.log(`This request didn't originate from Shopify`)
        response.status(403).send();
    }
    try {
        const cart = request.body;
        const cartId = cart.id;
        functions.logger.log(`Cart ${cartId} updated`);
        const docRef = admin.firestore().collection('carts').doc(cartId)
        await docRef.set(cart, { merge: true });
        response.status(200).send()
        return
    } 
    catch(error){
        functions.logger.error(error)
        response.status(500).send(error)
        return
    }
});
