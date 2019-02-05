import React from 'react';
import {Component} from 'react';
import { DeviceEventEmitter, StyleSheet, Text, View, Linking } from 'react-native';

import Textile, {API, Models} from '@textile/react-native-sdk';

type Props = {};

type NodeStage = 'empty' | 'setup' | 'starting' | 'started'
type State = {
  api_version: string
  current_state: string
  overview: Models.Overview
  peer_id: string
  previous_state: string
  stage: NodeStage
}
export default class App extends Component<Props> {
  state = {
    api_version: 'unknown',
    current_state: 'active',
    overview: {
      account_peer_cnt: -1,
      thread_cnt: -1,
      file_cnt: -1,
      contact_cnt: -1
    },
    peer_id: 'unknown',
    previous_state: 'unknown',
    stage: 'empty'
  }

  textile = Textile

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.stage !== prevState.stage) {
      switch (this.state.stage) {
        case 'empty':
          break;
        case 'setup':
          console.info('Creating an instance of Textile');
          this.setup()
          break;
        case 'starting':
          console.info('Creating a Textile node and starting the instance');
          this.startNode()
          break;
        case 'started':
          console.info('Textile running -- checking version');
          this.getAPIVersion()
          this.getPeerId()

          // No need for a helper
          API.overview().then((result: Models.Overview) => {
            this.setState({
              overview: result
            })
          })

          // Setup a l
          break;
      }
    }
  }

  componentDidMount() {
    if (!this.textile.isInitialized()) {
      this.setState({stage: 'setup'})
    }
  }
  setup () {
    // First you setup your state-preserving instance of Textile
    this.textile.setup()
    
    // We'll ad a listener so we can display updates issued by the AppStateEventHandler
    DeviceEventEmitter.addListener('@textile/appNextState', (payload) => {
      const previous_state = this.state.current_state
      this.setState({current_state: payload.nextState, previous_state})
    })

    this.setState({stage: 'starting'})
  }
  startNode() {
    // Next, you tell that instance to create a Textile node and start it
    this.textile.createAndStartNode().then(() => {
      this.setState({stage: 'started'})
    }).catch((error) => {
      console.error(error)
    })
  }
  getAPIVersion() {
    // You can run the api object right on your textile instance
    this.textile.api.version().then((result: string) => {
      this.setState({api_version: result})
    }).catch((error: Error) => {
      console.error(error)
    })
  }
  getPeerId() {
    // You can use your node's API from anywhere in your code by importing the API class
    API.peerId().then((result: string) => {
      this.setState({peer_id: result})
    }).catch((error: Error) => {
      console.error(error)
    })
  }

  componentWillUnmount () {
    this.textile.tearDown()
  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Mobile IPFS App</Text>
        <Text style={styles.subheading}
              onPress={() => Linking.openURL('https://textile.io')}>
          Powered by Textile
        </Text>
        <Text style={styles.instructions}>API Version: {this.state.api_version}</Text>
        <Text style={styles.instructions}>Peer ID: {this.state.peer_id.substring(0, 12)}...</Text>
        <Text style={styles.instructions}>Pin Count: {this.state.overview.file_cnt}</Text>
        <Text style={styles.instructions}>Current State: {this.state.current_state}</Text>
        <Text style={styles.instructions}>Previous State: {this.state.previous_state}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  heading: {
    fontSize: 20,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 14,
    textAlign: 'center',
    margin: 10,
    color: '#2935FF',
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
