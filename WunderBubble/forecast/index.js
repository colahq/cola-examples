// Copyright © 2016 Cola, Inc. All rights reserved.

// The Forecast component is used to display a full set of current observations
// and future forecasts.

const React = require('react');
const {
  Image,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View
} = require('react-native');
var Linking = require('Linking');

const Overview = require('./overview.js');
const Daily = require('./daily.js');

const DateFormat = require('dateformat');

const { getWebUrl } = require('../wundergroundapi.js');
const { getImageSource } = require('../utilities.js');

// This component is used to display a full set of current observations and
// future forecasts
//
// Optional properties:
//    location  Object  Object with latitude and longitude for the location
//    current   Object  Object with time, temperature, description, direction,
//                      speed, and icon.  Any which are not provided will have
//                      a suitable replacement value.
//    time      String  If current is provided, time must be provided.
//    name      String  Name of the participant.  If not provided, the empty string
//                      will be displayed.
//    city      String  City of the location.  If not provided, the empty string
//                      will be displayed.
//    daily     Array   An array containing objects suitable for display by the
//                      Daily component.
const Forecast = React.createClass({

  // This method is used for linking out to a web site URL when the link in the
  // footer is tapped.  It simply gets the URL associated with the location and
  // "links" to it.  If the location is not provided (shouldn't happen), it will
  // go to the default URL.
  openDailyForecast : function() {
    Linking.openURL(getWebUrl(this.props.location));
  },

	render : function() {

    // Cache the property for frequent and easy access
		const current = this.props.current;

    // These are all optional and are more involved to produce.
		var time, temperature, description, wind, icon;

    // Produce all the complex optional ones here instead of polluting the inline work.
		if (current) {
			time = (DateFormat((new Date(this.props.time)), "dddd h:MM TT")).toUpperCase();
			temperature = current.temp;
			description = current.description.toUpperCase();
			wind = ('Wind ' + current.direction + ' at ' + current.speed + ' mph').toUpperCase();
			icon = current.icon;
		}

    // Deal with temperature specifically, because zero is a valid value.  A simple
    // check of (!temperature) would not work here.  It would cause a temperature of
    // zero to display as "--°" which is obviously incorrect.
    if ((temperature == null) || (temperature == undefined)) {
      temperature = '--';
    }

		return (
			<View style={Styles.screen}>
				<View style={Styles.container}>
					<View style={Styles.header}>
						<View style={Styles.nameAndCity}>
							<Text style={Styles.name}>{(this.props.name || '')}</Text>
							<Text style={Styles.city}>{this.props.city || ''}</Text>
						</View>
						<Text style={Styles.time}>{time || ''}</Text>
						<View style={Styles.conditions}>
							<View style={Styles.temperatureColumn}>
								<View style={Styles.temperatureRow}>
									<Text style={Styles.temperature}>{temperature + '°'}</Text>
									<Text style={Styles.scale}>{'F'}</Text>
								</View>
							</View>
							<View style={Styles.iconContainer}>
								<Image style={Styles.icon} source={getImageSource(icon)} />
							</View>
						</View>
            <Text style={Styles.description} numberOfLines={1}>{description || ''}</Text>
            <Text style={Styles.wind}>{wind || ''}</Text>
					</View>
					<Overview
					  style={Styles.overview}
            like={current ? current.like : null}
					  humidity={current ? current.humidity : null}
					  pressure={current ? current.pressure : null}
					  sunrise={current ? current.sunrise : null}
					  sunset={current ? current.sunset : null}
					/>
					<View style={Styles.separator} />
					<Text style={Styles.daySpan}>NEXT 3 DAYS</Text>
					<Daily style={Styles.daily} forecasts={this.props.daily} />
          <View style={Styles.footer}>
					  <TouchableWithoutFeedback onPress={() => this.openDailyForecast()}>
					    <View>
      					<Text style={Styles.link}>For 10 days and more…</Text>
      				</View>
    				</TouchableWithoutFeedback>
  				</View>
        </View>
		  </View>
    );
	}
});

const Styles = StyleSheet.create({

  screen : {
    flex						: 1,
    flexDirection   : 'column',
    justifyContent  : 'space-between',
    backgroundColor : 'rgb(44, 100, 167)'
  },

  container : {
    flexDirection  : 'column',
    alignItems     : 'stretch',
    flexWrap       : 'nowrap',
    marginLeft     : 20,
    marginRight    : 20,
    marginTop      : 15,
    marginBottom   : 30
  },

  header : {
    flexDirection  : 'column',
    flexWrap       : 'nowrap',
    justifyContent : 'space-between',
    height         : 179,
    marginBottom   : 5
  },

  nameAndCity : {
    flexDirection  : 'row',
    justifyContent : 'space-between'
  },

  name : {
    fontSize   : 24,
    fontFamily : 'HelveticaNeue',
    fontWeight : '300',
    color      : 'white'
  },

  city : {
    fontSize   : 24,
    fontFamily : 'HelveticaNeue',
    fontWeight : '300',
    color      : 'white'
  },

  time : {
    textAlign  : 'right',
    fontFamily : 'HelveticaNeue',
    fontSize   : 13,
    fontWeight : '300',
    color      : 'white'
  },

  conditions : {
    flexDirection  : 'row',
    justifyContent : 'space-between'
  },

  temperatureColumn : {
    flexDirection  : 'column',
    alignSelf      : 'flex-end',
    alignItems     : 'stretch',
    flexWrap       : 'nowrap',
    justifyContent : 'flex-end'
  },

  temperatureRow : {
    flexDirection :'row',
    alignItems    : 'flex-end'
  },

  temperature : {
    textAlign  : 'center',
    fontFamily : 'HelveticaNeue',
    fontSize   : 60,
    fontWeight : '300',
    color      : 'white',
    flexWrap   : 'nowrap'
  },

  scale : {
    textAlign    : 'right',
    fontFamily   : 'HelveticaNeue',
    fontSize     : 30,
    fontWeight   : '300',
    color        : 'white',
    marginBottom : 9
  },

  iconContainer : {
    flexDirection  : 'column',
    justifyContent : 'flex-start',
    width          : 60
  },

  icon : {
    width  : 60,
    height : 60
  },

  description : {
    textAlign     : 'auto',
    fontFamily    : 'HelveticaNeue-CondensedBold',
    fontSize      : 35,
    color         : 'white'
  },

  wind : {
    textAlign  : 'auto',
    fontFamily : 'HelveticaNeue',
    fontSize   : 15,
    color      : 'white'
  },

  overview : {
    flexDirection  : 'row',
    justifyContent : 'flex-start',
    alignItems     : 'stretch',
    marginTop			 : 20,
    marginBottom   : 10,
    overflow       : 'hidden',
    height         : 156
  },

  separator : {
    height          : 1,
    backgroundColor : 'rgba(255, 255, 255, 0.25)'
  },

  daySpan : {
    textAlign    : 'auto',
    fontFamily   : 'HelveticaNeue-CondensedBold',
    fontSize     : 20,
    color        : 'white',
    marginTop    : 16,
    marginBottom : 4
  },

  daily : {
    height : 186
  },

  footer : {
    flexDirection  : 'column',
    justifyContent : 'center',
    height         : 52
  },

  link : {
    fontSize           : 14,
    fontFamily         : 'HelveticaNeue',
    color              : 'white',
    textDecorationLine : 'underline'
  },
});

module.exports = Forecast;
