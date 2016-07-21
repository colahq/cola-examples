// Copyright © 2016 Cola, Inc. All rights reserved.

// The Minimize component is used as the top-level display of the bubble when it's
// in either of the BUBBLE_OUTGOING_MODE or BUBBLE_INCOMING_MODE modes.

const React = require('react');
const {
	Image,
  StyleSheet,
  NetInfo,
  Text,
  TouchableHighlight,
  View
} = require('react-native');
const MapView = require('MapView');

const {
	Bubble,
	Conversation,
	PrivacyAccess
} = require('cola-api');

const Access = require('./access.js');
const Payload = require('./payload.js');

const {
  locateAndForecast,
  getImageSource
} = require('./utilities.js');

// The Flag component is used to represent a single participant on the MapView
// while the bubble is being displayed in one of the inline modes.
//
// Properties:
//    participantIdentifier	String	The identifier for the participant represented
//																	by this flag.
const Flag = React.createClass({

	// Create the state to start the component
	getInitialState : function() {
		return this.makeState();
	},

	// Listen for payload changes to update as necessary
	componentDidMount : function() {
		this.payloadListener = Payload.addChangeListener(this.payloadChanged);
	},

	// Need to make sure to remove the listener on unmount
	componentWillUnmount : function() {
		Payload.removeChangeListener(this.payloadListener);
	},

	// Since the state of a Flag is deterministic, the state generation can use
	// a shared method.  This can be a good technique as long as the state can
	// be generated deterministicly at any time.
  makeState : function() {

		// Get the participant and their status.  The property for this component
		// only contains the participant identifier for brevity.
		const participant = Conversation.getParticipant(this.props.participantIdentifier);
		const status = Payload.getParticipantStatus(participant);

		// Establish the icon value to use if it exists
		const icon = (status.current ? status.current.icon : null);

		// The state for this component uses the display value for the temperature.
		// This requires doing a little extra work to verify the value and then to
		// decorate it.  A simple check of (!status.current.temp) would not work here
		// since zero is a valid temperature.  This would cause a temperature of zero
		// to display as "--°" which is obviously incorrect.
		const temperature = ((!status.current ||
			(status.current.temp == null) ||
		  (status.current.temp == undefined)) ? '--°' : (status.current.temp + '°'));

		// The state for this component is the important bits being displayed: name,
		// icon, and temperature.  Since flags are displayed in limited space, the
		// first word of a short name for the participant is used.  There are other
		// techniques which could be used and would be better for localization, but
		// this is left as an exercise for the reader.
    return {name        : participant.shortName.match(/\S*/i)[0],
            icon        : icon,
            temperature : temperature};
  },

	// When the payload changes, simply update the state.  This will cause the
	// component to "react" properly.
  payloadChanged : function() {
    this.setState(this.makeState());
  },

  render : function() {
    return (
      <View style={Styles.annotation}>
        <View style={Styles.flag}>
          <View style={{flexDirection:'row', justifyContent:'center'}}>
            <Image style={Styles.icon} source={getImageSource(this.state.icon)} />
            <Text style={Styles.temperature}>
              {this.state.temperature}
            </Text>
          </View>
          <Text style={Styles.name}>
            {this.state.name}
          </Text>
        </View>
        <View style={Styles.tail} />
      </View>
		);
  }
});

// This component is used as the top-level display of the bubble when it's
// in one of the inline modes.  It currently has no properties.
const Minimize = React.createClass({

	// Create the state to start the component
	getInitialState : function() {
		return this.makeState();
	},

	componentDidMount : function() {

		// Register listeners for participant, payload, and privacy access changes.
		// Save the subscriptions for removing later.
		this.participantListener = Conversation.addParticipantsListener(this.participantsChanged);
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
    Conversation.removeParticipantsListener(this.participantListener);
    PrivacyAccess.removePrivacyAccessListener(this.accessListener);
    NetInfo.removeEventListener('change', this.networkChanged);
  },

	// This method provides a mechanism for generating a "clean" version of the
  // state object to be used with this component.  It's fine to use this to
  // get the initial state or to update the state at any point during execution.
  // This can be a good technique if the state is deterministic.
  makeState : function() {

		// It's possible for this method to be called prior to this.state existing
		// (i.e. to establish the inital state to start via getInitialState).  This
		// method will try to carry some of the existing state forward.
    var state = (this.state || {});

		// To prevent shuffling of the annotations on MapView (it doesn't like that).
		// This will capture the existing annotations and only add ones which don't
		// exist in the list already.
		var annotations = (state ? state.annotations : []) || [];

		// Iterate through all the participants in the conversation.
    var participants = Conversation.participants || [];
    for (var i = 0; i < participants.length; i++) {
      var participant = participants[i];

			// Find the participant in the list of annotations and add them if they do
			// not exist already.
      var identifier = participant.identifier;
      if (-1 === annotations.findIndex((e) => e.id === identifier)) {

				// A participant must have a status and location to be added.  MapView
				// can't display an annotation unless it has a location, and we don't
				// want to display a participant if they haven't shared their status.
        var status = Payload.getParticipantStatus(participant);
        if (status && status.location) {

					// The MapView is a little unique in how it displays custom flags.  A
					// class or element can be passed for the view.  If all flags were the
					// same, a class could be passed.  Because these flags must each be
					// unique with an identifier back to the participant, an element is
					// created with the property and pass along as the view.
					//
					// Annotations are also required to have a unique identifier, so they
					// can be managed by the runtime.  Since the participant identifiers
					// are known to be unique, these will be used as the unique identifier
					// for the annotation as well.
          annotations.push({latitude:status.location.latitude,
                            longitude:status.location.longitude,
                            id:identifier,
                            view:React.createElement(Flag, { participantIdentifier:identifier }),
                            pin:'lowerCenter'});
        }
      }
		}

		// This component attempts to
    return ({
			annotations    : annotations,
     	network        : state.network,
     	access         : PrivacyAccess.getServiceSetting('location'),
     	isComplete     : (participants.length === annotations.length),
     	didFirstRegion : (this.state && state.didFirstRegion)
		});
  },


  onRegionChangeComplete : function() {
    var state = this.state;
    if (!state.didFirstRegion) {
      state.didFirstRegion = true;
      this.setState(state);
    }
  },

	// This bubble tries not to zoom unless certain conditions are met.  This
	// determination is maintained in the state as isComplete.  On each layout,
	// this component will zoom based upon this determination.
  onLayout : function() {
    this.refs['mapview'].zoomToAnnotations(!this.state.isComplete);
  },

	// In the case when the current particpant has not shared their status, a button
	// will be displayed.  Pressing this button is supposed to share their status.
	// This method kicks off that process by asking the utility function to start
	// that location and forecasting.  This component doesn't need to know of any
	// callback results on any other data, since it's watching for payload changes.
	// When the payload does change at some point in the future, this component will
	// automatically react to those changes by updating the state.
  onPress : function() {
    locateAndForecast();
  },

  participantsChanged : function() {

		// Capture the state prior to setting it to something which may have changed.
    var state = this.state;

		// Now set the state.
    this.setState(this.makeState());

		// Using the captured state prior to the updates, determine if the map should
		// zoom to the annotations or not.
    if (state.didFirstRegion) {
      this.refs['mapview'].zoomToAnnotations(!state.isComplete);
    }
  },

  payloadChanged : function() {

		// Like when the participants changed, capture the state prior to setting it
		// to something which may have changed.
    var state = this.state;

		// Update the state, if it did.
    this.setState(this.makeState());

		// Using the captured state prior to the updates, determine if the map should
		// zoom to the annotations or not.
    if (state.didFirstRegion) {
      this.refs['mapview'].zoomToAnnotations(!state.isComplete);
    }
  },

	// When PrivacyAccess changes, recapture the state and set it.  This will cause
	// this component to "react" to any changes.
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

	render : function(state) {

		// This will be used to hold the individual views displayed in the bubble.
    var children = new Array;

		// React requires children to be keyed uniquely, so this uses a child counter
		// as a key to mark them uniquely.  See
		// https://facebook.github.io/react/docs/multiple-components.html#dynamic-children
		var j = 0;

		// This component starts with a MapView.  React Native should really have marked
		// the MapView component as experimental or deprecated.  Cola will be replacing
		// it soon with a more feature rich version.  For now, see the documentation
		// at http://facebook.github.io/react-native/releases/0.28/docs/mapview.html
		children.push(
			<MapView
				ref={'mapview'}
				key={j++}
				style={Styles.map}
				scrollEnabled={false}
				zoomEnabled={false}
				pointerEvents='none'
				onRegionChangeComplete={this.onRegionChangeComplete}
				annotations={this.state.annotations} />
		);

		// If the current particpant is not in the list of annotations, alter the
		// display to prompt for sharing.
		if (-1 === this.state.annotations.findIndex((e) => e.id === Conversation.me.identifier)) {

			// If there is no network, need to present an overly indicating failure.
      if (!this.state.network) {

				// This hierarchy is very similar to the Access component.  It might be
        // possible to split that component up into a general "alert" type panel
        // and then build Access on top of that.
        children.push(
          <View key={j++} style={Styles.overlay}>
            <View style={{flex:1, flexDirection:'column', justifyContent:'center', marginHorizontal:20, alignItems:'stretch'}}>
              <View style={{flexDirection : 'column'}}>
                <Text style={Styles.prompt}>{'Network Unavailable'}</Text>
                <Text style={Styles.message}>
                  {'This action cannot be done because no network is available. Check iOS status bar for Airplane Mode and network signal strength. Please try again after network connectivity is restored.'}
                </Text>
              </View>
            </View>
          </View>);
      }

			// If there is no access to location at this time, prompt them for it.
      else if (PrivacyAccess.PRIVACY_SETTING_AUTHORIZED != this.state.access) {
        children.push(<Access key={j++} style={Styles.overlay} underlay={'light'} />);
      }

			// If the network was good and the bubble has location access, add the
			// "Share My Weather" button.
      else {
        children.push(
          <View key={j++} style={Styles.shareOverlay}>
            <TouchableHighlight style={Styles.button} underlayColor={Styles.button.borderColor} onPress={this.onPress}>
              <View>
                <Text style={Styles.buttonText}>
                  {'Share my location and weather'}
                </Text>
              </View>
            </TouchableHighlight>
          </View>
        );
			}
		}

		return (
			<View style={Styles.container} onLayout={this.onLayout}>
				{children}
			</View>
		);
	}
});

// Currently, there is a bug in the layout of edge-to-edge and full style bubbles.
// Their base view is not extended all the way to the edges, therefore it's
// required that bubbles artificially extend their bounds beyond the horizontal
// and vertical edges by these constants.  The need for these will change in the
// near future.
const HORIZONTAL_CHROME_MARGIN = 17;
const VERTICAL_CHROME_MARGIN = 8;

const Styles = StyleSheet.create({

	buttonText : {
		textAlign  : 'center',
		fontSize   : 15,
		fontWeight : '600',
		color      : '#525252'
	},

	name : {
		fontSize         : 12,
		color            : 'white',
		marginHorizontal : 3,
		marginBottom     : 3
	},

	temperature : {
		fontSize    : 15,
		color       : 'white',
		marginRight : 3
	},

	prompt : {
		fontSize         : 17,
		fontWeight       : 'bold',
		textAlign        : 'center',
		color            : '#4a4a4a'
	},

	message : {
		fontSize     : 13,
		fontWeight   : '500',
		textAlign    : 'center',
		color        : '#4a4a4a',
		marginTop    : 10,
		marginBottom : 15
	},

	container : {
		flex          : 1,
		alignItems    : 'stretch',
		flexDirection : 'column'
	},

	map : {
		position : 'absolute',
		left     : -HORIZONTAL_CHROME_MARGIN,
		top      : -VERTICAL_CHROME_MARGIN,
		right    : -HORIZONTAL_CHROME_MARGIN,
		bottom   : -VERTICAL_CHROME_MARGIN
	},

	overlay : {
		position        : 'absolute',
		top             : -VERTICAL_CHROME_MARGIN,
		left            : -HORIZONTAL_CHROME_MARGIN,
		bottom          : -VERTICAL_CHROME_MARGIN,
		right           : -HORIZONTAL_CHROME_MARGIN,
		backgroundColor : 'rgba(255, 255, 255, 0.8)'
	},

	shareOverlay : {
		position        : 'absolute',
		flexDirection   : 'column',
		justifyContent  : 'center',
		alignItems      : 'center',
		left            : -HORIZONTAL_CHROME_MARGIN,
		right           : -HORIZONTAL_CHROME_MARGIN,
		top             : -VERTICAL_CHROME_MARGIN,
		bottom          : -VERTICAL_CHROME_MARGIN,
		backgroundColor : 'rgba(255, 255, 255, 0.8)'
	},

	button : {
		justifyContent    : 'center',
		alignItems        : 'center',
		paddingHorizontal : 12,
		paddingVertical   : 8,
		borderWidth       : 1,
		borderRadius      : 6,
		borderColor				: 'rgba(155, 155, 155, 0.5)',
		backgroundColor   : 'rgba(255, 255, 255, 0.8)'
	},

	annotation : {
		flexDirection : 'column',
		alignItems    : 'center'
	},

	flag : {
		flexDirection   : 'column',
		alignItems      : 'center',
		borderRadius    : 3,
		backgroundColor : 'rgb(57, 174, 223)'
	},

	icon : {
		marginHorizontal : 3,
		marginVertical   : 3,
		width            : 16,
		height           : 16
	},

	tail : {
		width             : 0,
		height            : 0,
		backgroundColor   : 'transparent',
		borderStyle       : 'solid',
		borderLeftWidth   : 5,
		borderRightWidth  : 5,
		borderBottomWidth : 7,
		borderLeftColor   : 'transparent',
		borderRightColor  : 'transparent',
		borderBottomColor : 'rgb(57, 174, 223)',
		transform         : [ { rotate : '180deg' } ]
	}
});

module.exports = Minimize;
