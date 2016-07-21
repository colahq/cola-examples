// Copyright © 2016 Cola, Inc. All rights reserved.

// This module implements the interfaces for interacting with the API provided by
// the Weather Underground.  To read more about their API, visit the documentation
// for their API at https://www.wunderground.com/weather/api/d/docs.
//
// NOTE that in the very near future, all requests will be required to be secure
// (https).  Make sure to start preferring this over insecure (http) now!

const API_BASE_URL = 'https://api.wunderground.com/api/';

// API key retrieved from Weather Underground at https://www.wunderground.com/weather/api
const API_KEY = <YOUR API KEY HERE>;

// Certain API requests can be combined.  See documentation on the Weather Underground
// API site at https://www.wunderground.com/weather/api/d/docs?d=data/index&MR=1.
// In this case the current conditions, the reverse geocode lookup, the forecast, and
// astronomy (for sunrise and sunset) are all retrieved together.
const FEATURES_PATH = '/conditions/geolookup/forecast/astronomy/q/';

// Specify JSON format for results.
const FORMAT_PATH_SUFFIX = '.json';

// The Weather Underground provides several sets of icons for the weather conditions.
// See them and their documentation at
// https://www.wunderground.com/weather/api/d/docs?d=resources/icon-sets
const ICONS_BASE_URL = 'https://icons.wxug.com/i/c/';
const ICON_SET = 'k';
const ICON_FORMAT = '.gif';

// This is the base URL to Weather Underground.
const WEB_BASE_URL = 'https://www.wunderground.com';

// This URL is not part of the Weather Underground API, per se.  It does seem to be
// the base path which is returned at part of the current observation.  The proper
// behavior would likely be to hold the URL returned in the requests and save it
// as part of the saved data.
const WEB_URL_PATH = '/cgi-bin/findweather/getForecast?query=';

var WeatherUndergroundAPI = {

	// Given a latitude and longitude, returns a Promise for the API request to
	// get all the data wanted.
	requestWeatherDataForLocation : function(latitude, longitude) {

		const url = API_BASE_URL + API_KEY + FEATURES_PATH + latitude + ',' + longitude + FORMAT_PATH_SUFFIX;

		return new Promise(function(resolve, reject) {

			var request = new XMLHttpRequest();

			request.onreadystatechange = (e) => {
				if (request.readyState !== 4) {
					return;
				}

				// On success, pass along the results.
				if (request.status === 200) {
					resolve(JSON.parse(request.responseText));
				}

				// On Failure return the response text.
				else {
					reject(Error(request.statusText));
				}
			};

			// Start the request
			request.open('GET', url, true);
			request.send(null);
		});
	},

	// When provided an icon name as returned by a previous API request, this method
	// returns a Weather Underground URL to the respective icon in the specified
	// icon set.  See other available icon sets at
	// https://www.wunderground.com/weather/api/d/docs?d=resources/icon-sets
	getIconUrl : function(icon) {
		return ICONS_BASE_URL + ICON_SET + '/' + icon + ICON_FORMAT;
	},

	// This method returns a web site URL suitable for a web browser.  It will
	// produce the URL for the specified location if provided.  If none is
	// provided, the base URL (homepage) will be returned.
	getWebUrl : function(location) {
		var result = WEB_BASE_URL;
		if (location) {
			result += WEB_URL_PATH + location.latitude + ',' + location.longitude;
		}
		return result;
	}
};

module.exports = WeatherUndergroundAPI;
