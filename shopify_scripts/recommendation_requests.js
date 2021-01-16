// console.log('loaded recommendations AI requests functions');

const MAXRECS = 6;
async function requestShopifyRecsAsync(productId) {
  const baseUrl = `/recommendations/products`;
  const url = baseUrl + ".json?product_id=" + productId + "&limit=4"
  const response = await fetch(url);
//   console.log(response);
  const data = await response.json();
  const products = data.products;
  return products.map(function(p){
    return {
      image: p.images[0],
      title: p.title,
      price: p.price,
      url: p.url
    }
  });
}

async function requestShopifyRecentlyViewedAsync() {
  // recently viewed products are stored using cookies. I need to retrieve them.
  const baseUrl = `/recently-viewed/products`;
  const url = baseUrl + "&limit=8"
  const response = await fetch(url);
//   console.log(response);
  const data = await response.json();
  const products = data.products;
  return products.map(function(p){
    return {
      image: p.images[0],
      title: p.title,
      price: p.price,
      url: p.url
    }
  });
}

async function requestRecommendationsAsync(payload) {
  var t0 = performance.now()
  const placement = 'recently_viewed_default';
  const url = `https://us-central1-hexxee-personalisation.cloudfunctions.net/getRecommendations`
  const completePayload = {
    placement: placement,
    payload: payload,
  }
//   console.log(JSON.stringify(completePayload));
  const response = await fetch(url, { 
    method: 'POST',
    mode: 'cors',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(completePayload)
  });
  const data = await response.json();
  var t1 = performance.now()
  console.log("Call to requestRecommendationsAsync took " + (t1 - t0) + " milliseconds.")
  return data;
}

function checkRecsEnabled(clientId){
	var enabled = optimizelyClientInstance.isFeatureEnabled('recommended_products', `${clientId}`);
	var show_recs = optimizelyClientInstance.getFeatureVariableBoolean('recommended_products', 'show_recs', `${clientId}`);
    var variation_id = optimizelyClientInstance.getVariation('recommended_products_test', `${clientId}`);
    console.log(`OPTIMIZELY: EXPERIMENT ENABLED=${enabled} SHOW RECS=${show_recs} VARIATION ID=${variation_id}`); 
    return show_recs;
}

async function getRecommendedForYouProducts(customerId, callback){
//   console.log(`User requested recommended products for them`);
  
  ga(async function(tracker) {
    
    var clientId = tracker.get('clientId');
	var show_recs = checkRecsEnabled(clientId);
    if (show_recs === false){
      	console.log(`Recommendations not enabled for this experiment.`);
      	return
    }  
    var filterString = "";
   	var dryRun = true;
    var contextEventType = "detail-page-view";
    
//     console.log(`customer id = ${customerId}`);
//     console.log(`client id = ${clientId}`);
    
    var payload = {
//       "filter": filterString,
      "dryRun": dryRun,
      "userEvent": {
        "eventType": `${contextEventType}`,
        "userInfo": {
          "visitorId": `${clientId}`, // unique across browser sessions
//           "userId": `${customerId}`, // unique across device sessions
//           "ipAddress": "ip-address",
//           "userAgent": "user-agent"
        },
        "eventDetail": {
//           "experimentIds": "experiment-group"
        },
        "productEventDetail": {
          "productDetails": [
            {
              "id": `${1234}`,
            }
          ]
        }
      }
    }
    
   	var result = await requestRecommendationsAsync(payload);
    var recommendationToken = result.recommendationToken;
    var productIds = result.results.slice(0, MAXRECS);
    if (productIds.length === 0){
      return
    }
    showRecommendationsLoadingSection("recommended-for-you")
    var products = await getShopifyProductPayloadsAsync(productIds)
    if (products.length === 0){
    	return;
    }
    showRecommendations(products, recommendationToken, "recommended-for-you");
    callback();
  });
}

function getYouMayAlsoLikeProducts(customerId, product){
//   console.log(`User requested similar products`);
  
  ga(async function(tracker) {
    var clientId = tracker.get('clientId');
    var show_recs = checkRecsEnabled(clientId);
    if (show_recs === false){
      	console.log(`Recommendations not enabled for this experiment.`);
      	return
    }
    var filterString = "";
   	var dryRun = true;
    var contextEventType = "detail-page-view";
    
//     console.log(`customer id = ${customerId}`);
//     console.log(`client id = ${clientId}`);
    
    var payload = {
//       "filter": filterString,
      "dryRun": dryRun,
      "userEvent": {
        "eventType": `${contextEventType}`,
        "userInfo": {
          "visitorId": `${clientId}`, // unique across browser sessions
//           "userId": `${customerId}`, // unique across device sessions
//           "ipAddress": "ip-address",
//           "userAgent": "user-agent"
        },
        "eventDetail": {
//           "experimentIds": "experiment-group"
        },
        "productEventDetail": {
          "productDetails": [
            {
              "id": `${product.id}`,
            }
          ]
        }
      }
    }
    
   	var result = await requestRecommendationsAsync(payload);
    var recommendationToken = result.recommendationToken;
    var productIds = result.results.slice(0, MAXRECS);
    if (productIds.length === 0){
      return
    }
    showRecommendationsLoadingSection("recommended-for-you")
    var products = await getShopifyProductPayloadsAsync(productIds)
    if (products.length === 0){
    	return;
    }
    showRecommendations(products, recommendationToken, "you-may-also-like");
  });
}

function getRecentlyViewedProducts(customerId, product){
//   console.log(`User requested most recently viewed products`);
  
  ga(async function(tracker) {
    var clientId = tracker.get('clientId');
    var show_recs = checkRecsEnabled(clientId);
    if (show_recs === false){
      	console.log(`Recommendations not enabled for this experiment.`);
      	return
    }
    var filterString = "";
   	var dryRun = true;
    var contextEventType = "detail-page-view";
    
//     console.log(`customer id = ${customerId}`);
//     console.log(`client id = ${clientId}`);
    
    var payload = {
//       "filter": filterString,
      "dryRun": dryRun,
      "userEvent": {
        "eventType": `${contextEventType}`,
        "userInfo": {
          "visitorId": `${clientId}`, // unique across browser sessions
//           "userId": `${customerId}`, // unique across device sessions
//           "ipAddress": "ip-address",
//           "userAgent": "user-agent"
        },
        "eventDetail": {
//           "experimentIds": "experiment-group"
        },
        "productEventDetail": {
          "productDetails": [
            {
              "id": `${product.id}`,
            }
          ]
        }
      }
    }
    
   	var result = await requestRecommendationsAsync(payload);
    var recommendationToken = result.recommendationToken;
    var productIds = result.results.slice(0, MAXRECS);
    if (productIds.length === 0){
      return
    }
    showRecommendationsLoadingSection("recommended-for-you")
    var products = await getShopifyProductPayloadsAsync(productIds)
    if (products.length === 0){
    	return;
    }
    showRecommendations(products, recommendationToken, "recently-viewed");
  });
}

function addImageProcessAsync(src){
  return new Promise((resolve, reject) => {
    let img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = src
  })
}

async function getShopifyProductPayloadsAsync(products){
  	var t0 = performance.now()
	const out = await Promise.all(products.map(function(product){
    	return getProductAsync(product.id);
    }));
//   	const images = out.map(function(p){
//       var splitImageSrc = p.image.split(".jpg");
//       var smallerImageSrc = splitImageSrc[0] + '_400x.jpg' +  splitImageSrc[1];
//       return smallerImageSrc;
//     });
    const imageLoadPromises = [];
//   	images.forEach(function(i, index){
//       if (index <= 3){
//       	imageLoadPromises.push(addImageProcessAsync(i))
//       } 
//     });
//   	await Promise.all(imageLoadPromises);
  	var t1 = performance.now()
  	console.log("Call to getShopifyProductPayloadsAsync took " + (t1 - t0) + " milliseconds.")
    return out;
}

function showRecommendationsLoadingSection(sectionId){
	//  get sections to change HTML for   
//     var recsDiv = document.getElementById(sectionId);
//     recsDiv.style.display = "block";
};

function showRecommendations(products, recommendationToken, sectionId){
  	var t0 = performance.now()
  	var desktopListItems = products.map(function(product) { 
        return renderDesktopProduct(product, recommendationToken);
    }).join(" ");
    var mobileListItems = products.map(function(product) { 
        return renderMobileProduct(product, recommendationToken);
    }).join(" ");

	//  get sections to change HTML for   
    var recsDiv = document.getElementById(sectionId);
  	var desktopSlider = recsDiv.querySelectorAll(".desktop-recs-slider")[0]
    var mobileSlider = recsDiv.querySelectorAll(".mobile-recs-slider")[0]
  
    // Setup the desktop slider
    var backButton = recsDiv.querySelectorAll(".goToPrevSlideContainer")[0];
    var forwardButton = recsDiv.querySelectorAll(".goToNextSlideContainer")[0];  	
  	var itemsInSlider = 4;
    var sliderItems = products.length;
    
    if (sliderItems <= itemsInSlider){
      forwardButton.style.visibility = 'hidden';
    }
    backButton.style.visibility = 'hidden';
    
    
  	var slider = $(`#${sectionId} .desktop-recs-slider`).lightSlider({
      item: itemsInSlider,
      autoWidth: false,
      slideMove: 1, // slidemove will be 1 if loop is true
      slideMargin: 50,

      addClass: '',
      mode: "slide",
      useCSS: true,
      cssEasing: 'ease', //'cubic-bezier(0.25, 0, 0.25, 1)',//
      easing: 'linear', //'for jquery animation',////

      speed: 600, //ms'
      auto: false,
      loop: false,
      slideEndAnimation: true,
      pause: 2000,

      keyPress: false,
      controls: false,
      prevHtml: '',
      nextHtml: '',

      rtl:false,
      adaptiveHeight:false,

      vertical:false,
      verticalHeight:500,
      vThumbWidth:100,

      thumbItem:10,
      pager: false,
      gallery: false,
      galleryMargin: 50,
      thumbMargin: 5,
      currentPagerPosition: 'middle',

      enableTouch:true,
      enableDrag:true,
      freeMove:true,
      swipeThreshold: 40,

      responsive : [],

      onBeforeStart: function (el) {},
      onSliderLoad: function (el) {},
      onBeforeSlide: function (el) {},
      onAfterSlide: function (el) {
        var newIndex = slider.getCurrentSlideCount() - 1;

        // hide backward button if at start
        if (newIndex <= 0){
          backButton.style.visibility = 'hidden';
          // show the backward button if enough items and not at start
        } else if (sliderItems > itemsInSlider) {
          backButton.style.visibility = 'visible';
        }

        // hide the forward button if at end
        if (newIndex > (sliderItems - itemsInSlider - 1)){
          forwardButton.style.visibility = 'hidden';
          // show the forward button if enough items and not at end
        } else if (sliderItems > itemsInSlider) {
          forwardButton.style.visibility = 'visible';
        }
      },
      onBeforeNextSlide: function (el) {},
      onBeforePrevSlide: function (el) {}
    });
    
    $(`#${sectionId} .goToPrevSlide`).on('click', function () {
      // TODO: move all new items into view if possible
      forwardButton.style.visibility = 'visible';
      var slideCount = slider.getCurrentSlideCount() - 1;
//       console.log(`Current slide index=${slideCount}`)
      var toIndex = slideCount - 4;
      if (toIndex < 0){
        toIndex = 0;
      }
      slider.goToSlide(toIndex);
//       console.log(`Moved to index=${toIndex}`)
    });

    $(`#${sectionId} .goToNextSlide`).on('click', function () {
      backButton.style.visibility = 'visible';
      var slideCount = slider.getCurrentSlideCount() - 1;
//       console.log(`Current slide index=${slideCount}`)
      var toIndex = slideCount + 4;
      if (toIndex > (sliderItems - itemsInSlider)){
        toIndex = sliderItems - itemsInSlider;
      }
      slider.goToSlide(toIndex);
//       console.log(`Moved to index=${toIndex}`)
    });
  
  	// set the HTML
    desktopSlider.innerHTML = desktopListItems;
    mobileSlider.innerHTML = mobileListItems;
  
	// make mobile cards clickable
    var mobileCarouselItems = recsDiv.querySelectorAll(".splide__slide")
    var moblileCarouselItemLinks = recsDiv.querySelectorAll(".main-link")
    
    for (let index = 0; index < mobileCarouselItems.length; index++) {
        (function () {
            var card = mobileCarouselItems[index];
      		var mainLink = moblileCarouselItemLinks[index];
          	card.addEventListener("click", function(event){mainLink.click()})
        }()); // immediate invocation
    }
  
    // animate into view
  recsDiv.style.opacity = 0.0;
  recsDiv.style.display = "block";
  $(`#${sectionId}`).animate({opacity: '1.0'}, 1000, function(){
//     console.log(`FINISHED ANIMATING`);
  });
};

function showhide(id) {
  if (document.getElementById) {
    var divid = document.getElementById(id);
    var divs = document.getElementsByClassName("hideable");
    for (var i = 0; i < divs.length; i = i + 1) {
      $(divs[i]).fadeOut("slow");
    }
    $(divid).fadeIn("slow");
  }
  return false;
}

async function getProductAsync(productId){
  var data = await fetch(`/search/suggest.json?type=product&q=id:${productId}&resources[type]=product`)
  var json = await data.json();
  var products = json.resources.results.products;
  if (products.length >= 1){
    return products[0];
  } else {
    return null;
  }
}

function renderDesktopProduct(product, recToken) {
  var productUrl = updateQueryStringParameter(product.url, 'recToken', recToken);
  var imageHtml = getImageHtml(product);
	
  return [
    '<li>',
	`<a href=${productUrl} style="text-decoration: none; color:black">`,
    '<div class="">',
    imageHtml,
    '<div class="post-image-div"></div>',
    '<p class="product-title text-center text-uppercase">' + product.title + '</p>',
    '<p class="product-price text-center text-uppercase">' + formatMoney(product.price, window.moneyFormat) + '</p>',
    '</div>',
    '</a>',
    ' </li>'
    ].join("");
}

function getImageHtml(product){
  var src = product.image;
  var splitImageSrc = src.split(".jpg");
  var img200 = splitImageSrc[0] + '_200x.jpg' +  splitImageSrc[1];
  var img400 = splitImageSrc[0] + '_400x.jpg' +  splitImageSrc[1];
  var img600 = splitImageSrc[0] + '_600x.jpg' +  splitImageSrc[1];
  var img800 = splitImageSrc[0] + '_800x.jpg' +  splitImageSrc[1];
  var img1000 = splitImageSrc[0] + '_1000x.jpg' +  splitImageSrc[1];
  var img1200 = splitImageSrc[0] + '_1200x.jpg' +  splitImageSrc[1];
  var img2000 = splitImageSrc[0] + '_2000x.jpg' +  splitImageSrc[1];
  
  var imageHtml = `
  <img 
src="${img600}"
  alt="Text" 
  class="img-fluid"
  >`
  return imageHtml;
}

function renderMobileProduct(product, recToken) {
  var productUrl = updateQueryStringParameter(product.url, 'recToken', recToken);
  var imageHtml = getImageHtml(product);

  return [
    '<li class="splide__slide">',    
    '<div class="">',
    imageHtml,
    '<div class="post-image-div"></div>',
    '<p class="product-title text-center text-uppercase">',
    `<a href="${productUrl}" class="main-link" style="text-decoration: none; color:black">`,
    `${product.title}`,
    '</a>',
    '</p>',
    '<p class="product-price text-center text-uppercase">' + formatMoney(product.price, window.moneyFormat) + '</p>',
    '</div>',
    '</li>',
    ].join("");
}


function updateQueryStringParameter(uri, key, value) {
  var re = new RegExp("([?&])" + key + "=.*?(&|$)", "i");
  var separator = uri.indexOf('?') !== -1 ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, '$1' + key + "=" + value + '$2');
  }
  else {
    return uri + separator + key + "=" + value;
  }
}

/**
 * Currency Helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions that help with currency formatting
 *
 * Current contents
 * - formatMoney - Takes an amount in cents and returns it as a formatted dollar value.
 *
 */

const moneyFormat = '${{amount}}';

/**
 * Format money values based on your shop currency settings
 * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents
 * or 3.00 dollars
 * @param  {String} format - shop money_format setting
 * @return {String} value - formatted value
 */
function formatMoney(cents, format) {
  if (typeof cents === 'string') {
    cents = cents.replace('.', '');
  }
  let value = '';
  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  const formatString = format || moneyFormat;

  function formatWithDelimiters(
    number,
    precision = 2,
    thousands = ',',
    decimal = '.'
  ) {
    if (isNaN(number) || number == null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    const parts = number.split('.');
    const dollarsAmount = parts[0].replace(
      /(\d)(?=(\d\d\d)+(?!\d))/g,
      `$1${thousands}`
    );
    const centsAmount = parts[1] ? decimal + parts[1] : '';

    return dollarsAmount + centsAmount;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
  }

  return formatString.replace(placeholderRegex, value);
}