// Copyright © 2016 Cola, Inc. All rights reserved.

// Daily component used for display in Forecast

const React = require('react');
const {
  StyleSheet,
  Image,
  Text,
  View
} = require('react-native');

const DateFormat = require('dateformat');

const { getImageSource } = require('../utilities.js');

// This component is used to represent the forecast for a single day.
//
// Properties:
//    date  Number          Date (seconds since epoch) of the forecast
//    icon  String          Icon name to be displayed
//
// Optional properties:
//    high  String/Number   Forecast high temperature ('--' displayed for undefined)
//    low   String/Number   Forecast low temperature ('--' displayed for undefined)
const Day = React.createClass({

  render : function() {

    // Create a "now" date to compare against the date this view represents,
    // so the day presented can be done so as "Today" instead of the weekday.
    const now = new Date();
    const date = new Date(this.props.date * 1000);

    // Assume "Today" unless the dates don't match.
    var display = 'Today';
    if ((now.getFullYear() !== date.getFullYear()) ||
        (now.getMonth() !== date.getMonth()) ||
        (now.getDate() !== date.getDate()))
    {
      // Use the weekday, since the dates didn't match.
      display = DateFormat(date, 'dddd');
    }

    var high = this.props.high;
    var low = this.props.low;

    // The state for this component uses the display value for the high and low.
		// This requires doing a little extra work to verify the value.  A simple
    // check of (!high) or (!low) would not work here since zero is a valid value.
    // This would cause a temperature of zero to display as "--°" which is obviously
    // incorrect.
    if ((high == null) || (high == undefined)) {
      high = '--';
    }
    if ((low == null) || (low == undefined)) {
      low = '--';
    }

    return (
      <View style={Styles.container}>
        <View style={Styles.dayContainer}>
          <Text style={Styles.day}>{display.toUpperCase()}</Text>
        </View>
        <View style={Styles.forecastContainer}>
          <Image style={Styles.icon} source={getImageSource(this.props.icon)} />
          <Text style={Styles.high}>{high}</Text>
          <Text style={Styles.low}>{low}</Text>
        </View>
      </View>
    );
  }
});

// This component is used to display an array (up to 3) of daily forecasts.
//
// Optional properties:
//    forecasts  Array  Daily forecast objects containing values for "icon", "high",
//                      "low", and "date".
const Daily = React.createClass({

  render : function() {

    // Use the forecasts if provided, otherwise make sure the forecasts is
    // set to an array for easy iteration later.
    const forecasts = this.props.forecasts || [];

    // This will be used to hold the individual views for the days.
    var children = new Array;

    // Iterate through all the forecasts but no more than 3 of them.  It would be
    // possible to coordinate with the parent and have it pass in the number of
    // forecasts/days it wishes to display. That's an excercise left for the reader.
    for (var i = 0, j = 0; i < Math.max(0, Math.min(forecasts.length, 3)); i++) {

      const forecast = forecasts[i];

      // Add a Day for this forecast. React requires children to be keyed uniquely,
      // so this uses an extra child counter as a key to mark them uniquely.  See
      // https://facebook.github.io/react/docs/multiple-components.html#dynamic-children
      children.push(<Day
        key={j++}
        icon={forecast.icon}
        high={forecast.high}
        low={forecast.low}
        date={forecast.date} />);

      // Add a gap with separator to display between each of the days.  Because
      // this is a peer of the Day, it must be keyed as well.
      children.push(
        <View key={j++} style={Styles.separatorContainer}>
          <View style={Styles.separator} />
        </View>);
    }

    // The last Day should not have a separator after it, so it must be removed.
    if (0 < children.length) {
      children.pop();
    }

    // Place the children inside a view which is set up as specified by the caller.
    return (
      <View {...this.props}>
        {children}
      </View>);
  }
});

const Styles = StyleSheet.create({

  container : {
    flexDirection   : 'row',
    alignItems      : 'center',
    flexWrap        : 'nowrap',
    height          : 51
  },

  dayContainer : {
    flex          : 0.5,
    flexDirection : 'row',
    alignItems    : 'center'
  },

  day : {
    textAlign        : 'auto',
    fontFamily       : 'HelveticaNeue-Medium',
    fontSize         : 13,
    marginHorizontal : 10,
    color            : 'white',
    flexWrap         : 'nowrap'
  },

  forecastContainer : {
    flexDirection  : 'row',
    justifyContent : 'flex-end',
    alignItems     : 'center'
  },

  icon: {
    width            : 29,
    height           : 29,
    marginHorizontal : 15
  },

  high : {
    textAlign        : 'auto',
    fontFamily       : 'HelveticaNeue',
    fontSize         : 24,
    fontWeight       : '600',
    marginHorizontal : 10,
    color            : 'white',
    flexWrap: 'nowrap'
  },

  low : {
    textAlign        : 'auto',
    fontFamily       : 'HelveticaNeue',
    fontSize         : 24,
    marginHorizontal : 10,
    color            : 'white',
    flexWrap         : 'nowrap'
  },

  separatorContainer : {
    height         : 11,
    flexDirection  : 'column',
    justifyContent : 'center'
  },

  separator : {
    height          : 1,
    backgroundColor : 'rgba(255, 255, 255, 0.25)'
  }
});

module.exports = Daily;
