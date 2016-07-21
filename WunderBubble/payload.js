// Copyright © 2016 Cola, Inc. All rights reserved.

// This module is responsible for managing all of the payload data.  This means
// for this collaborative bubble it combines the immutable data from the conversation
// stream as well as dynamic data from Firebase.  Although Firebase is used for
// this bubble, Firebase is not required.

const { Bubble, Conversation } = require('cola-api');

const Firebase = require('firebase');
const Uuid = require('react-native-uuid');

const EventEmitter = require('EventEmitter');
var Emitter = new EventEmitter();

// This is the initial setup data.  In the case of compose/setup mode, this value
// will be constructed over time and eventually be provided to Cola to be written
// to the data stream for the conversation.  After moving out of the compose mode,
// this will be provided to the bubble as the BUBBLE_INITIAL_PAYLOAD property.
var Initial;

var Sender;           // Identifier of the bubble sender
var Statuses = {};    // Shared statuses retrieved from Firebase

// These are the keys related to a participant's status when stored in Intial or
// when stored in the list of Statuses.
const PAYLOAD_STATUS_KEYS = ['location', 'city', 'time', 'current', 'daily'];

// Initialize Firebase for usage.  NOTE that this does not necessarily follow
// best practices for Firebase usage.  If using Firebase, the documentation on
// their web site (https://firebase.google.com/docs/) should be consulted.
Firebase.initializeApp(<YOUR FIREBASE OPTIONS HERE>);

var Reference;  // Reference to the database location for this bubble.

var Payload = {

  // Payload wraps the EventEmitter with its own methods, so it may better control
  // what is being set up and how.  This give a good injection point for any future
  // access or alteration of the callers.
  addChangeListener : function(handler) {
    return Emitter.addListener('change', handler);
  },

  // For the same reason as addChangeListener, the removal is a wrapper as well.
  removeChangeListener : function(subscription) {
    subscription.remove();
  },

  // This method is used by the base bubble implementation to determine if the
  // Initial object is properly set up and ready to be sent to Cola for writing
  // into the conversation data stream.  To be valid, it's required to have a
  // UUID as the database rendezvous point and the sender's status values.
  isReadyToSend : function() {

    // It's only valid if filled and has a unique reference
    if (!Initial || !Initial.uuid) return false;

    // All status values must exist to send
    for (var i = 0; i < PAYLOAD_STATUS_KEYS.length; i++) {
      if (!Initial[PAYLOAD_STATUS_KEYS[i]]) return false;
    }

    return true;
  },

  getInitialPayload : function() {
    // Make a copy to hand out, so callers can alter the result and not cause
    // changes underneath Payload.
    return JSON.parse(JSON.stringify((Initial || {})));
  },

  initialize : function (initial, sender) {

    // Capture the sender identifier for later comparisons.
    Sender = sender;

    // If this is a new initialization (or different), need to set up everything.
    if (!Initial || (initial.uuid.toLowerCase() != Initial.uuid.toLowerCase())) {

      // Make sure there is an Initial object.
      Initial = (initial || {});

      // If there isn't a unique reference for this bubble, establish one now.
      // This just happens to be the way this bubble works.  It's possible to
      // establish uniqueness or backend rendezvous points in other ways.
      if (!Initial.uuid) {
        Initial.uuid = Uuid.v4();
      }

      // Cola allows characteristics of the bubble layout to be specified in the
      // top-level of the payload written to the data stream.  It will use this
      // information to establish a starting layout size for display.  If this
      // mechanism is used, the bubble should not call Bubble.setPreferredSize.
      // See the Cola API documentation for more information.
      if (!Initial.initialLayout) {

        // NOTE that there is currently a bug with ratio for edge-to-edge bubbles.
        // The height of the bubble header will not be taken into account.  This
        // will cause the whole bubble to not be displayed at this ratio, but the
        // content will be.  This is being debated as "proper" behavior.
        Initial.initialLayout = { ratio : 1 };
      }

      // Start off with no statuses
      Statuses = {};

      // Start watching the database location for this bubble.
      Reference = Firebase.database().ref(Initial.uuid);

      // Register for value and its changes at the database location
      Reference.on('value', function(snapshot) {

        // Capture all the statuses to create a local shadow
        snapshot.forEach(function(child) {
          Statuses[child.key] = child.val();
        });

        // Inform observers of changes just received.
        Emitter.emit('change');
      });

      // Inform observers of changes in the available statuses at initialize.
      Emitter.emit('change');
    }
  },

  // Given a participant, this method will get the respective status.  Since the
  // sender status is stored separately, this has to do the proper dance to grab
  // the correct one for the caller.
  getParticipantStatus : function(participant) {

    var result;

    if (participant.identifier) {

      // If it's not the sender, return the status from the shared set of statuses.
      if (participant.identifier !== Sender) {
        result = Statuses[participant.identifier];
      }

      // It's the sender so pull the status from the intial payload.  Notice this
      // pulls only the status values and no other values.
      else {
        result = {};
        PAYLOAD_STATUS_KEYS.forEach(function(key) {
          result[key] = Initial[key];
        });
      }
    }

    return result;
  },

  setLocationAndForecast : function(location, city, current, daily) {

    // This is just a cheap way of checking to see if this is compose.  If it is,
    // it's known to be the initial data to be filled.
    if (!Initial.location) {

      // This is the immutable data which will be placed into the conversation
      // stream.  This data should be as minimal as possible.  Large data sets
      // can take a long time to load.  Data should be kept to a maximum of
      // 1K for the best performance and the best behavior.  Larger data should
      // live elsewhere and be loaded asynchronously as needed for the user.
      Initial.location = location;
      Initial.city = city;
      Initial.current = current;
      Initial.daily = daily;
      Initial.time = (new Date()).toISOString();

      // After the change, make sure to notify listeners by emitting an event.
      Emitter.emit('change');
    }

    // If this is setting for a participant who isn't the sender, make sure to
    // update the local statuses list, push to Firebase, and send the notification.
    else if (Conversation.me && Conversation.me.identifier && (Conversation.me.identifier !== Sender)) {

      // This list of statuse is maintained by participant identifier.  This will
      // capture the participant's status and put it in the list of statuses.
      const key = Conversation.me.identifier;
      const status = {
        location : location,
        city     : city,
        current  : current,
        daily    : daily,
        time     : (new Date()).toISOString()
      };
      Statuses[key] = status;

      // Now this needs to dynamically update the database with this participant's
      // status.  This simply produces an update with the status to be uploaded
      // to Firebase.  This is only one technique.  There are other ways to
      // manipulate the data in Firebase.  Choose a suitable technique for your
      // data.  See the Firebase documentation located at
      // https://firebase.google.com/docs/reference/js/
      var update = {};
      update[key] = status;
      Reference.update(update);

      // Notice that this does not provide a reference to this bubble or the participant
      // causing the notification.  Bubbles can only send notifications for themselves,
      // and the current participant is assumed.  Participants can not notify on behalf
      // of another participant in the conversation either.
      Bubble.sendMinorNotificationText('shared weather');

      // Inform observers of changes just made.
      Emitter.emit('change');
    }
  }
}

module.exports = Payload;
