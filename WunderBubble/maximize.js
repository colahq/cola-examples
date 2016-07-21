// Copyright © 2016 Cola, Inc. All rights reserved.

// The Maximize component is used as the top-level display of the bubble when it's
// in either of the BUBBLE_FULL_OUTGOING_MODE or BUBBLE_FULL_INCOMING_MODE modes.

const React = require('react');
const {
  StyleSheet,
  ScrollView,
  Image,
  Text,
  TouchableHighlight,
  TouchableWithoutFeedback,
  View,
} = require('react-native');
var Linking = require('Linking');

const {
  Bubble,
  Conversation,
  PrivacyAccess
} = require('@colahq/cola-api');

const Forecast = require('./forecast');
const Payload = require('./payload.js');

const { getWebUrl } = require('./wundergroundapi.js');
const { locateAndForecast } = require('./utilities.js');

// This component is used as the top-level display of the bubble when it's
// in either of the full screen modes.  It currently has no properties.
const Maximize = React.createClass({

  getInitialState : function() {

    // Set up the initial state to be used.  An array is used for the list of
    // statuses, so the display order is maintained between updates.  The
    // selection is used to track which item in the list is expanded.  This
    // implementation only allows one item to be expanded at a time.
    return {
      statuses  : [],
      access    : PrivacyAccess.getServiceSetting('location'),
      selection : -1
    };
  },

  // Start listening to changes for various services.  Conversation is watched for
  // the participant list changing.  Payload is watched in order to know when data
  // for participants is available.  PrivacyAccess is watched to know if "me" has
  // access to the location.
  componentDidMount : function() {
    this.participantListener = Conversation.addParticipantsListener(this.participantsChanged);
    this.payloadListener = Payload.addChangeListener(this.payloadChanged);
    this.accessListener = PrivacyAccess.addPrivacyAccessListener(this.accessChanged);
  },

  // Remove all the subscriptions set up during componentDidMount.
  componentWillUnmount : function() {
    PrivacyAccess.removePrivacyAccessListener(this.accessListener);
    Payload.removeChangeListener(this.payloadListener);
    Conversation.removeParticipantsListener(this.participantListener);
  },

  // When participants change, the process of updating the state is a bit more
  // involved.  The order as the user sees the participants in the list should
  // not change, therefore participants and their respective status are captured
  // in the first order encountered.  Every time there is an update to the
  // participant list, the state is searched for an existing entry.  If it's
  // found, the entry will be reused.  If an entry isn't found, one will be
  // added to the end of the list.
  participantsChanged : function() {

    // Get the current list of statuses to update
    var statuses = this.state.statuses;

    // Start iterating over the participants
    var participants = Conversation.participants || [];
    for (var i = 0; i < participants.length; i++) {
      var participant = participants[i];

      // Find the participant in the current list of statuses
      var idx = statuses.findIndex((e) => e.participant === participant.identifier);

      // If the participant wasn't found, it's time to add it.
      if (-1 === idx) {

        // Ask Payload for the status for this participant
        var status = Payload.getParticipantStatus(participant);

        // Depending if there is a status, either the full information or partial
        // information is added into the statuses list.  At the very least, this
        // will hold the participant's place in the order.
        if (status) {
          statuses.push({participant : participant.identifier,
                         name        : participant.short_name,
                         status      : status});
        }
        else {
          statuses.push({participant : participant.identifier,
                         name        : participant.short_name});
        }
      }

      // Participant was found but always make sure the name is up-to-date.
      else {
        var existing = statuses[idx];
        existing.name = participant.short_name;
      }
    }

    // Update the state for the component.
    this.setState({
      statuses  : statuses,
      access    : PrivacyAccess.getServiceSetting('location'),
      selection : this.state.selection
    });
  },

  // Payload changes aren't as involved as participants changing, but it's still
  // more than a simple update of the state.  Because the Payload will only be
  // changing statuses, it's only important to update those of participants already
  // in the list which is in state.
  payloadChanged : function() {

    // Iterate through all the current statuses.
    var statuses = this.state.statuses;
    for (var i = 0; i < statuses.length; i++) {

      var item = statuses[i];

      // This will get the participant using the identifier in the item from the list
      // and then it will ask Payload for their status.  This is done this way, because
      // the method to get the status expects a Participant instance.  If it worked
      // purely based upon identifier, it could simply be called using the identifier
      // saved in the list of statuses.
      var status = Payload.getParticipantStatus(Conversation.getParticipant(item.participant));

      // If there is a status, make sure it's updated in the list.
      if (status) {
        item.status = status;
      }
    }

    // Update the state of this component.
    this.setState({
      statuses  : statuses,
      access    : PrivacyAccess.getServiceSetting('location'),
      selection : this.state.selection
    });
  },

  // On PrivacyAccess changes, simply update the access and let the component "react."
  accessChanged : function() {
    var state = this.state;
    state.access = PrivacyAccess.getServiceSetting('location');
    this.setState(state);
  },

  // When the selection changes, update the state and cause the component to update.
  didSelect : function(idx) {
    var state = this.state;
    state.selection = idx;
    this.setState(state);
  },

  // For performance reasons, the list of statuses starts as an empty list of
  // participants.  This means the background draws very quickly on maximize
  // and then the layout will update with the list as a result of this call to
  // participantsChanged.
  //
  // This sort of technique is good in order to give your users immediate response
  // in your bubble.  The bubble appears to react to their interactions immediately.
  //
  // It would be possible to add logic to only do this on first layout, but there
  // is no extra harm in having the call every time.  It will do a littl more work
  // to compute the list and statuses, but in the end, the final state will not
  // change between iterations.  At that point, React will not cause a relayout to
  // fire, because the state will not change.
  didLayout : function() {
    this.participantsChanged();
  },

  render : function() {

    // The hierarchy is being dynamically built up starting with the forecasts for
    // each participant in the statuses list.
    var participantViews = new Array;
    var statuses = this.state.statuses || [];
    for (var i = 0, j = 0; i < statuses.length; i++) {
      var status = statuses[i];

      // Only display statuses with locations (could really check for other data as well)
      if (!status.status || !status.status.location) continue;

      // If this is the selection, display the whole Forecast.
      if (i === this.state.selection) {
        participantViews.push(
          <View key={j++} style={Styles.selection} removeClippedSubviews={true} overflow='hidden'>
            <Forecast name={status.name}
                  location={status.status.location}
                      city={status.status.city}
                      time={status.status.time}
                   current={status.status.current}
                     daily={status.status.daily} />
          </View>
        );
      }

      // When it's not the current selection, it will be displayed "collapsed" with
      // a text view in the bottom right indicating the forecasts are in the unexposed
      // area of the view.  Tapping anywhere in the this child will cause the selection
      // to change though.
      else {

        // Create a closure to be used as the onPress function for tapping.  It will
        // cause the selection to be set to the current iteration value of i.
        var press = (function(idx) {
          this.didSelect(idx);
        }).bind(this, i);

        // The Forecast is wrapped with a "clipping" view.  This causes only some of
        // the items in the Forecast to be seen and the rest hidden.  It gives the
        // effect without needing to teach Forecast how to display in two modes.
        participantViews.push(
          <TouchableWithoutFeedback key={j++} onPress={press}>
            <View style={Styles.item} removeClippedSubviews={true} overflow='hidden'>
              <Forecast name={status.name}
                    location={status.status.location}
                        city={status.status.city}
                        time={status.status.time}
                     current={status.status.current}
                       daily={status.status.daily} />
              <View style={{flexDirection:'row', justifyContent:'flex-end', position:'absolute', right:20, bottom:5}}>
                <Image source={require('./resources/Arrow-down.png')} />
                <Text style={{textAlign:'auto', fontFamily:'HelveticaNeue', fontSize:15, color:'white'}}>Forecast</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        );
      }

      // Put a separator between the participant views
      participantViews.push(<View key={j++} style={Styles.separator} />);
    }

    // The main children of this render will be a scroll view of the participant views.
		var j = 0;
    var children = [
      <ScrollView key={j++} style={Styles.screen} contentContainerStyle={Styles.container} onLayout={this.didLayout}>
        {participantViews}
      </ScrollView>
    ];

    // If there were statuses, check to see if other content should be displayed
    if (0 < statuses.length) {

      // If "me" does not exist, see about getting it into the mix.
      if (-1 === statuses.findIndex((e) => ((e.participant === Conversation.me.identifier) && e.status && e.status.location))) {

        // If not authorized to get location, show the access prompt for the user.
        if (PrivacyAccess.PRIVACY_SETTING_AUTHORIZED != this.state.access) {
          children.push(
            <PrivacyAccess key={j++} style={Styles.access} underlay={'dark'} />
          );
        }

        // Add the "Share My Location" button which will locate and forecast.
        else {
          children.push(
            <View key={j++} style={Styles.overlay}>
              <TouchableHighlight style={Styles.button} underlayColor={Styles.button.borderColor} onPress={ () => locateAndForecast() }>
                <View>
                  <Text style={[Styles.buttonText, {color:Bubble.Colors.IncomingText}]}>
                    {'Share my location and weather'}
                  </Text>
                </View>
              </TouchableHighlight>
            </View>
          );
        }
      }
    }

    // Finally the children are packed together will a footer on the bottom which
    // will link out to the Weather Underground.
    return (
			<View style={Styles.screen}>
				{children}
        <View style={Styles.footer}>
          <TouchableWithoutFeedback onPress={ () => Linking.openURL(getWebUrl()) }>
            <Image style={Styles.logo} source={require('./resources/WU_long_icon.png')} />
          </TouchableWithoutFeedback>
        </View>
			</View>
    );
  }
});

const Styles = StyleSheet.create({

  selection : {
    flexDirection  : 'column',
    justifyContent : 'flex-start'
  },

  item : {
    flexDirection  : 'column',
    justifyContent : 'flex-start',
    height         : 200
  },

  separator : {
    flex            : 1,
    height          : 1,
    backgroundColor : 'white'
  },

  screen : {
    flex						: 1,
    flexDirection   : 'column',
    backgroundColor : 'rgb(44, 100, 167)'
  },

  container : {
    flexDirection  : 'column',
    justifyContent : 'flex-start'
  },

  access : {
    position        : 'absolute',
    top             : 0,
    left            : 0,
    bottom          : 0,
    right           : 0,
    backgroundColor : 'rgba(0,0,0,0.4)'
  },

  overlay : {
    position        : 'absolute',
    flexDirection   : 'column',
    justifyContent  : 'center',
    alignItems      : 'center',
    left            : 0,
    right           : 0,
    top             : 0,
    bottom          : 0,
    backgroundColor : 'rgba(0,0,0,0.4)'
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

  buttonText : {
    textAlign  : 'center',
    fontSize   : 15,
    fontWeight : '600'
  },

  footer: {
    flexDirection   : 'row',
    justifyContent  : 'flex-end',
    height          : 44,
    backgroundColor : 'rgba(255, 255, 255, 0.7)'
  },

  logo: {
    width       : 128,
    height      : 27,
    alignSelf   : 'center',
    marginRight : 8
  }
});

module.exports = Maximize;
