// Copyright © 2016 Cola, Inc. All rights reserved.

// This file provides a set of utility functions for other components.

const { setLocationAndForecast } = require('./payload.js');
const {
  requestWeatherDataForLocation,
  getIconUrl
} = require('./wundergroundapi.js');

// This helper function simply provides a Promise interface over the geolocation
// API for getting the user's location.
const LocateUser = function() {

  // Return a promise for the location lookup
  return new Promise(function(resolve, reject) {

    // Use the Navigator/Geolocation polyfill to get the user's current location.
    // More can be learned at https://developer.mozilla.org/en-US/docs/Web/API/Geolocation
    navigator.geolocation.getCurrentPosition(function(position) {

      // Call the resolve on success
      resolve({
        latitude  : position.coords.latitude,
        longitude : position.coords.longitude});

    }, function(error) {

      // If the error isn't an Error, turn it into one to call the rejection.
      if (!(error instanceof Error)) {
        error = new Error(error);
      }

      // Call the failure
      reject(error);
    }, {
      // Set the options for performing the location retrieval.
      enableHighAccuracy : true,    // Try to be accurate
      timeout            : 20000,
      maximumAge         : 1000});
  });
};

// Used to track the currently outstanding location and forecast request.
var Outstanding;

var Utilities = {

  locateAndForecast : function() {

    // Only start off the process if not doing it already.
    if (!Outstanding) {

      // Shared reject function which simply clears the outstanding request.  It
      // would be better to do something on errors.  This is left as an exercise
      // for the reader.
      var reject = function(error) {
        Outstanding = null;
      }

      Outstanding = new Promise(function(resolve, reject) {

        // Try location lookup
        LocateUser().then(function(result) {

          // On success, perform the weather lookup, which includes reverse geolocation lookup.
          requestWeatherDataForLocation(result.latitude, result.longitude).then(function(results) {

            // Capture the location and city based upon the actual results.  Use
            // the value from the results of the geolocation request, so it matches
            // the weather result values.  Some of the data coming back is in a
            // format that's not wanted, so this needs to massage some of the
            // fields a little bit.
            const location = {
              latitude  : parseFloat(results.location.lat),
              longitude : parseFloat(results.location.lon)
            };
            const city = results.location.city + ', ' + results.location.state;

            // Build up the current conditions using ONLY the items which are wanted.
            // This reduces the size of the payload data being saved.  Some of the
            // data coming back is in a format that's not wanted, so this needs to
            // massage some of the its fields too.
            const current = {
              temp        : Math.round(results.current_observation.temp_f),
              speed       : results.current_observation.wind_mph,
              like        : Math.round(results.current_observation.feelslike_f),
              humidity    : results.current_observation.relative_humidity,
              pressure    : results.current_observation.pressure_in,
              description : results.current_observation.weather,
              direction   : results.current_observation.wind_dir,
              icon        : results.current_observation.icon,
              sunrise     : '' + (results.sun_phase.sunrise.hour % 12) + ':' +
                            results.sun_phase.sunrise.minute +
                            ((results.sun_phase.sunrise.hour < 12) ? 'AM' : 'PM'),
              sunset      : '' + (results.sun_phase.sunset.hour % 12) + ':' +
                            results.sun_phase.sunset.minute +
                            ((results.sun_phase.sunset.hour < 12) ? 'AM' : 'PM'),
            };

            // Gather the minimal amount of data for up to three forecasts.  Some of
            // the data coming back is in a format that's not wanted, so this needs to
            // massage some of the fields a little bit.  See a trend?
            var forecast = [];
            for (var i = 0; ((i < 3) && (i < results.forecast.simpleforecast.forecastday.length)); i++) {
              forecast.push({
                date : parseInt(results.forecast.simpleforecast.forecastday[i].date.epoch),
                high : results.forecast.simpleforecast.forecastday[i].high.fahrenheit,
                low  : results.forecast.simpleforecast.forecastday[i].low.fahrenheit,
                icon : results.forecast.simpleforecast.forecastday[i].icon
              });
            }

            // Save out the information
            setLocationAndForecast(location, city, current, forecast);

            // Mark as no longer outstanding
            Outstanding = null;

          }).catch(reject);
        }).catch(reject);
      });
    }
  },

  // Given an icon name retrieved in the weather results, get the image source
  // suitable for use by the Image component.
  getImageSource : function(icon) {

    // If icon isn't set, return the "Not Available" icon.
    if (!icon) return require('./resources/na.png');

    // The Image "source" property is an object.  It should have a "uri" declared
    // inside of it.  This should be the URL for the icon which is retrieved
    // via the wundergroundapi function.
    return {
      uri : getIconUrl(icon)
    };
  }
}

module.exports = Utilities;
