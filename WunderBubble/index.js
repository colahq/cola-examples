// Copyright © 2016 Cola, Inc. All rights reserved.

// This is the main entry point for the bubble.  Based upon the bubble mode,
// it will add the proper component for display.

const React = require('react');
const ReactNative = require('react-native');

const { Bubble } = require('cola-api');

const Compose = require('./compose.js');
const Minimize = require('./minimize.js');
const Maximize = require('./maximize.js');

const Payload = require('./payload.js');

// Establish the bubble with Cola.  This will be the main entry point for the
// bubble.  This component will be mounted and rendered in the current mode of
// display.  During the lifetime of the bubble, it's possible for the bubble
// instance to move through several different modes prior to the eventual
// unmount of the bubble.
const MyBubble = Bubble.createBubbleClass({

  componentDidMount : function() {

    var sender;

    // NOTE that at this time, the API lacks a call to get the sender.  Until
    // this is added in an upcoming release, it's possible to get it from a
    // "sender" property passed into the bubble.  This future API may not be
    // able to provide a full participant, so reliance should be on being an
    // identifer only.  This should only be done if currently not in setup
    // mode.  Participant identifiers will not be stable (or available) during
    // this mode.
    if ((Bubble.BUBBLE_SETUP_MODE !== this.props[Bubble.BUBBLE_MODE]) && this.props.sender) {

      // If it's an identifier already, just use it.
      if ((typeof(this.props.sender) === 'string') || (this.props.sender instanceof String)) {
        sender = this.props.sender;
      }

      // If it's not a string, assume it's a Participant
      else {
        sender = this.props.sender.identifier;
      }
    }

    // Make sure the payload management is set up with the initial value and sender
    Payload.initialize(this.props[Bubble.BUBBLE_INITIAL_PAYLOAD], sender);

    // Start watching for changes to the Payload.  This is done after initialize
    // so it doesn't get any notifications of changes until after it's set up
    // Payload the way it wants and expects.
    this.payloadListener = Payload.addChangeListener(this.payloadChanged);

    // Make sure the "Send" button is properly enabled based upon the Payload's
    // current ability to be sent.
    Bubble.setSendEnabled(Payload.isReadyToSend());
  },

  componentWillUnmount : function() {

    // Make sure to stop listening for changes to Payload.
    Payload.removeChangeListener(this.payloadListener);
  },

  payloadChanged : function() {

    // When Payload changes, update the "Send" button to properly reflects Payload's
    // current ability to be send.
    Bubble.setSendEnabled(Payload.isReadyToSend());
  },

  bubbleSetupDidComplete : function(callback) {

    // Complete the send by calling the callback with the inital payload which
    // will be inserted into the conversation data stream.
    callback(Payload.getInitialPayload());
  },

  render : function() {

    // This is a common method for choosing the proper display based upon
    // the bubble's current mode.  In this example, each of compose, inline,
    // and full screen have their own respective component to display.  Any
    // mode may have its own display, or all could share the same display.
    switch (this.props[Bubble.BUBBLE_MODE]) {

      case Bubble.BUBBLE_SETUP_MODE:
        return (<Compose />);

      case Bubble.BUBBLE_OUTGOING_MODE:
      case Bubble.BUBBLE_INCOMING_MODE:
        return (<Minimize />);

      case Bubble.BUBBLE_FULL_OUTGOING_MODE:
      case Bubble.BUBBLE_FULL_INCOMING_MODE:
        return (<Maximize />);
    }
  }
});
