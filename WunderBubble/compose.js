// Copyright © 2016 Cola, Inc. All rights reserved.

// The Compose component is used as the top-level display of the bubble when it's
// in setup mode.

const React = require('react');
const {
  Image,
  NetInfo,
  StyleSheet,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View
} = require('react-native');
var Linking = require('Linking');

const { PrivacyAccess } = require('cola-api');

const Access = require('./access.js');
const Payload = require('./payload.js');

const Forecast = require('./forecast');

const { getWebUrl } = require('./wundergroundapi.js');
const { locateAndForecast } = require('./utilities.js');

// This component is used as the top-level display of the bubble when it's
// in setup mode.  It currently has no properties.
const Compose = React.createClass({

  getInitialState : function() {
    return this.makeState();
  },

  componentDidMount : function() {

    // Register listeners for payload and privacy access changes.  Save the
    // subscriptions for removing later.
    this.payloadListener = Payload.addChangeListener(this.payloadChanged);
    this.accessListener = PrivacyAccess.addPrivacyAccessListener(this.accessChanged);

    // Use NetInfo to watch for network changes.  See the React Native documentation
    // for more information about this API.
    NetInfo.addEventListener('change', this.networkChanged);

    // Even though the listener is watching for changes, this component needs to
    // know the current state now.  This kicks off an immediate fetch of the value
    // and will simply call the normal channge method with the result.
    NetInfo.isConnected.fetch().then((isConnected) => {
      this.networkChanged(isConnected);
    });
  },

  componentWillUnmount : function() {

    // Unregister all the subscriptions that were established in componentDidMount.
    Payload.removeChangeListener(this.payloadListener);
    PrivacyAccess.removePrivacyAccessListener(this.accessListener);
    NetInfo.removeEventListener('change', this.networkChanged);
  },

  // This method provides a mechanism for generating a "clean" version of the
  // state object to be used with this component.  It's fine to use this to
  // get the initial state or to update the state at any point during execution.
  // This can be a good technique if the state is deterministic.
  makeState : function() {

    // The state for this component starts with the initial payload as the base.
    var state = Payload.getInitialPayload();

    // Add to it the current state of location access
    state.access = PrivacyAccess.getServiceSetting('location');

    // Carry the network state forward if known, otherwise assume
    // the network is fine.
    state.network = (this.state ? this.state.network : true);

    return state;
  },

  // When the payload changes, simply regenerate the state and set it.
  payloadChanged : function() {
    this.setState(this.makeState());
  },

  // When the privacy access changes, simply regenerate the state and set it.
  accessChanged : function() {
    this.setState(this.makeState());
  },

  // Any time NetInfo determines the network state has changed, this method
  // will execute with the network info.  This method is also used for the
  // explicit check used in componentDidMount.
  networkChanged : function(info) {

    // Start with a base "state"
    var state = this.makeState();

    // Set the network value based upon the info.  Since the listener callback
    // and the isConnected.fetch have different return types, this checks the
    // passed argument as either value.
    state.network = ((false !== info) && (info !== 'none'));

    // Update the component's state
    this.setState(state);
  },

	render : function() {

    // The compose starts out as a full screen display of the information in the
    // state.  From here though, the result may change to display something else.
		var result = (
      <View style={Styles.screen}>
        <ScrollView style={Styles.screen} contentContainerStyle={Styles.container}>
        <Forecast location={this.state.location}
                      city={this.state.city}
                      time={this.state.time}
                   current={this.state.current}
                    hourly={this.state.hourly}
                     daily={this.state.daily} />
        </ScrollView>
        <View style={Styles.footer}>
          <TouchableWithoutFeedback onPress={ () => Linking.openURL(getWebUrl()) }>
            <Image style={Styles.logo} source={require('./resources/WU_long_icon.png')} />
          </TouchableWithoutFeedback>
        </View>
      </View>
    );

    // If the location or current weather is unknown, there may be more to display.
		if (!this.state.location || !this.state.current) {

      // If there is no network, need to swap out what's displayed to be an overlay
      // with the network failure message.
      if (!this.state.network) {

        // This hierarchy is very similar to the Access component.  It might be
        // possible to split that component up into a general "alert" type panel
        // and then build Access on top of that.
        result = (
          <View style={Styles.screen}>
            <View style={Styles.underlay}>
              <View style={{flex:1, flexDirection:'column', justifyContent:'center', marginHorizontal:20, alignItems:'stretch'}}>
                <View style={{flexDirection : 'column'}}>
                  <Text style={Styles.prompt}>{'Network Unavailable'}</Text>
                  <Text style={Styles.message}>
                    {'This action cannot be done because no network is available. Check iOS status bar for Airplane Mode and network signal strength. Please try again after network connectivity is restored.'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      }

      // If there is access to location (but there wasn't location or current weather),
      // this will attempt to kick off the location and forecasting via utilities.
      else if (PrivacyAccess.PRIVACY_SETTING_AUTHORIZED === this.state.access) {
        locateAndForecast();
      }

      // There is no access, so display the Access component with the dark underlay.
      else {
        result = (
          <View style={Styles.screen}>
            <Access style={Styles.underlay} underlay='dark'/>
          </View>
        );
      }
		}

		return result;
	}
});

const Styles = StyleSheet.create({

  screen : {
    flex						: 1,
    flexDirection   : 'column',
    backgroundColor : 'rgb(44, 100, 167)'
  },

  container : {
    flexDirection  : 'column',
    justifyContent : 'flex-start'
  },

  footer : {
    flexDirection   : 'row',
    justifyContent  : 'flex-end',
    height          : 44,
    backgroundColor : 'rgba(255, 255, 255, 0.7)'
  },

  logo : {
    width       : 128,
    height      : 27,
    alignSelf   : 'center',
    marginRight : 8
  },

  underlay : {
    position        : 'absolute',
    top             : 0,
    left            : 0,
    bottom          : 0,
    right           : 0,
    backgroundColor : 'rgba(0,0,0,0.4)'
  },

  prompt : {
    fontSize         : 17,
    fontWeight       : 'bold',
    textAlign        : 'center',
    color            : 'white',
    textShadowColor  : 'rgba(0,0,0,0.5)',
    textShadowOffset : { width:1, height:2 },
    textShadowRadius : 4
  },

  message : {
    fontSize         : 13,
    fontWeight       : '500',
    textAlign        : 'center',
    color            : 'white',
    textShadowColor  : 'rgba(0,0,0,0.5)',
    textShadowOffset : {width:1, height:2},
    textShadowRadius : 4,
    marginTop        : 10,
    marginBottom     : 15
  }
});

module.exports = Compose;
