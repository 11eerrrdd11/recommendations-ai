const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {cartCreated, cartUpdated} = require('./src/cart_webhooks');
const {checkoutUpdated} = require('./src/checkout_webhooks');
const {logCartEvents} = require('./src/firestore_triggers');
const {saveClientId, getRecommendations, logUserEvent, orderPaid} = require('./src/http_triggers');
const {updateProductCatalog} = require('./src/pubsub_triggers');

admin.initializeApp(functions.config().firebase);

module.exports = {
    updateProductCatalog,
    cartCreated,
    cartUpdated,
    saveClientId, 
    logCartEvents,
    orderPaid, 
    logUserEvent, 
    // getRecommendations, // no need while collecting data
    // checkoutUpdated // not currently using checkoutId on backend
};
