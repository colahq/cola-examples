// Copyright © 2016 Cola, Inc. All rights reserved.

// Overview component used for displaying a set of current observations in Forecast

const React = require('react');
const {
  StyleSheet,
  Image,
  Text,
  View
} = require('react-native');

const DateFormat = require('dateformat');

// This component is used to display an overview of observations for current
// conditions.
//
// Optional properties:
//    like      String/Number   "Feels like" temperature ('--' displayed for undefined)
//    humidity  String/Number   Humidity percentage ('--' displayed for undefined)
//    pressure  String/Number   Pressure in inches ('--' displayed for undefined)
//    sunrise   String          Date string indicating sunrise (empty string displayed
//                              for undefined)
//    sunset    String          Date string indicating sunset (empty string displayed
//                              for undefined)
const Overview = React.createClass({

  render : function() {

    return (
      <View {...this.props}>
        <View style={Styles.container}>
          <View style={Styles.rowContainer}>
            <View style={Styles.iconAndLabel}>
              <Image style={Styles.icon} source={require('../resources/Feels like.png')} />
              <Text style={Styles.label}>FEELS LIKE</Text>
            </View>
            <Text style={Styles.value}>{(this.props.like || '--') + '°'}</Text>
          </View>
          <View style={Styles.rowContainer}>
            <View style={Styles.iconAndLabel}>
              <Image style={Styles.icon} source={require('../resources/Humidity.png')} />
              <Text style={Styles.label}>HUMIDITY</Text>
            </View>
            <Text style={Styles.value}>{(this.props.humidity || '--')}</Text>
          </View>
          <View style={Styles.rowContainer}>
            <View style={Styles.iconAndLabel}>
              <Image style={Styles.icon} source={require('../resources/Pressure.png')} />
              <Text style={Styles.label}>PRESSURE</Text>
            </View>
            <Text style={Styles.value}>{(this.props.pressure || '--') + ' in'}</Text>
          </View>
          <View style={Styles.rowContainer}>
            <View style={Styles.iconAndLabel}>
              <Image style={Styles.icon} source={require('../resources/Arrow-up.png')} />
              <Image style={Styles.sun} source={require('../resources/Sun-half.png')} />
              <Text style={Styles.value}>{(this.props.sunrise || '')}</Text>
            </View>
            <View style={Styles.iconAndLabel}>
              <Image style={Styles.icon} source={require('../resources/Arrow-down.png')} />
              <Image style={Styles.sun} source={require('../resources/Sun-half.png')} />
              <Text style={Styles.value}>{(this.props.sunset || '')}</Text>
            </View>
          </View>
        </View>
      </View>);
  }
});

const Styles = StyleSheet.create({

  container : {
    flex             : 1,
    flexDirection    : 'column',
    justifyContent   : 'flex-start',
    marginHorizontal : 20,
    flexWrap         : 'nowrap'
  },

  rowContainer : {
    flexDirection  : 'row',
    justifyContent : 'space-between',
    alignItems     : 'center',
    height         : 38,
    flexWrap       : 'nowrap'
  },

  iconAndLabel : {
    flexDirection : 'row',
    alignItems    : 'center'
  },

  label : {
    textAlign  : 'left',
    fontFamily : 'HelveticaNeue-Medium',
    fontSize   : 17,
    lineHeight : 24,
    color      : 'white',
    flexWrap   : 'nowrap'
  },

  value : {
    textAlign  : 'right',
    fontFamily : 'HelveticaNeue',
    fontSize   : 17,
    fontWeight : '600',
    lineHeight : 24,
    color      : 'white',
    flexWrap: 'nowrap'
  },

  icon : {
    width       : 20,
    height      : 20,
    marginTop   : 4,
    marginRight : 4
  },

  sun: {
    width       : 30,
    height      : 15,
    marginTop   : 2,
    marginRight : 4
  }
});

module.exports = Overview;
