// Copyright © 2016 Cola, Inc. All rights reserved.

// The Access component is used to display a full screen prompt for access to
// the location service.
//
// Although written specifically for the "location" service, this same component
// could be repurposed for any other service or for all privacy services.

const React = require('react');
const {
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} = require('react-native');

const { PrivacyAccess } = require('cola-api');

const Manifest = require('./manifest.json');

// This component is used to display a full screen prompt for access to the
// location service.
//
// Optional properties:
//    underlay  String  Either "light" or "dark" to indicate the color of the
//                      background being used for display under the prompt. If
//                      not provided or if an unrecognized value is provided,
//                      "dark" will be assumed.
const Access = React.createClass({

  _requestAccessToService : function() {
    PrivacyAccess.requestAccessToService('location', function() {
      // Do nothing special.  All other components and classes already watch
      // for changes in access and will react automatically based upon changes.
    });
  },

  render : function() {

    // Get the access setting for the location service.  This could be any other
    // service as well.
    const access = PrivacyAccess.getServiceSetting('location');

    // Prompt and message are automatically created based upon the current setting.
    var prompt, message;
    switch(access) {

      case PrivacyAccess.PRIVACY_SETTING_UNKNOWN:
        prompt = 'Share your location';
        message = 'Share your location with "' + Manifest.name + '" so it can:\n\nDisplay your location and request the location of the people you share this bubble with.';
        break;

      case PrivacyAccess.PRIVACY_SETTING_AUTHORIZED:
        throw new TypeError('The Access component should not be used if already authorized!');

      case PrivacyAccess.PRIVACY_SETTING_DENIED:
        prompt = 'Location Services Required';
        message = 'This bubble requires access to your location. Turn on location access in Settings > Cola.';
        break;

      case PrivacyAccess.PRIVACY_SETTING_RESTRICTED:
        prompt = 'Location Services Required';
        message = 'You do not have permission to share your location on this device. Contact your device administrator.';
        break;

      default:
        throw new TypeError('PrivacyAccess returned an unhandled setting!');
    }

    // All settings except for PRIVACY_SETTING_RESTRICTED have a button for the user.
    // In the case of PRIVACY_SETTING_DENIED though, the button title is different.
    var button;
    if (PrivacyAccess.PRIVACY_SETTING_RESTRICTED !== access) {
      button = (
        <TouchableHighlight style={Styles.button} underlayColor={this.props.style.backgroundColor} onPress={ () => this._requestAccessToService() }>
          <View>
            <Text style={Styles.buttonText}>{((PrivacyAccess.PRIVACY_SETTING_DENIED === access) ? 'Let\'s go to Settings' : 'Allow')}</Text>
          </View>
        </TouchableHighlight>
      );
    }

    // Based upon the underlay property set up the display style to be used for the text
    const underlay = (('light' == this.props.underlay) ? Styles.light : Styles.dark);

    return (
      <View {...this.props}>
        <View style={Styles.screen}>
          <View style={Styles.container}>
            <Text style={[underlay, Styles.prompt]}>{prompt}</Text>
            <Text style={[underlay, Styles.message]}>{message}</Text>
            {button}
          </View>
        </View>
      </View>
    );
  }
});

const Styles = StyleSheet.create({

  screen : {
    flex             : 1,
    flexDirection    : 'column',
    justifyContent   : 'center',
    marginHorizontal : 20,
    alignItems       : 'stretch'
  },

  container : {
    flexDirection : 'column'
  },

  button : {
    backgroundColor : 'white',
    borderColor     : 'rgb(149, 148, 153)',
    borderRadius    : 6,
    borderWidth     : 1,
    height          : 44,
    flexDirection   : 'column',
    justifyContent  : 'center',
    alignItems      : 'stretch'
  },

  buttonText : {
    fontSize   : 15,
    fontWeight : '600',
    textAlign  : 'center',
    color      : '#4a4a4a'
  },

  light : {
    color : '#4a4a4a'
  },

  dark : {
    color : 'white',
    textShadowColor  : 'rgba(0,0,0,0.5)',
    textShadowOffset : { width:1, height:2 },
    textShadowRadius : 4
  },

  prompt : {
    fontSize   : 17,
    fontWeight : 'bold',
    textAlign  : 'center',
  },

  message : {
    fontSize     : 13,
    fontWeight   : '500',
    textAlign    : 'center',
    marginTop    : 10,
    marginBottom : 15
  }
});

module.exports = Access;
