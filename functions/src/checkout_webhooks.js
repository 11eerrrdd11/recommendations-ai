const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {webhookRequestFromShopify, getUserFromCartAsync} = require('./helpers')

// Track the relationship between cartId and checkoutId
exports.checkoutUpdated = functions.https.onRequest(async (request, response) => {

    const fromShopify = webhookRequestFromShopify(request);
    if (fromShopify === false){
        functions.logger.log(`This request didn't originate from Shopify`)
        response.status(403).send();
    }
    
    try {
        const checkout = request.body;
        console.log(JSON.stringify(checkout))
        const checkoutId = `${checkout.id}`;
        const cartId = `${checkout.cart_token}`;
        functions.logger.log(`Checkout ${checkoutId} updated. CartId = ${cartId}`);

        // add the relationship between clientIds and checkouts to firestore
        const [clientId, userId, experimentId] = await getUserFromCartAsync(cartId);
        const docRef = admin.firestore().collection('clients').doc(clientId);
        await docRef.set({
            checkoutIds: admin.firestore.FieldValue.arrayUnion(checkoutId)
        }, { merge: true});
        functions.logger.log(`Updated checkoutId in client document`);
        response.status(200).send()
    }
    catch(error){
        console.log(error)
        response.status(500).send(error)
        return
    }
});
