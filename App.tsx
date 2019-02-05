import React from 'react';
import {Component} from 'react';
import { DeviceEventEmitter, StyleSheet, Text, View, Linking } from 'react-native';

import Textile, {API, Models} from '@textile/react-native-sdk';

type Props = {};

// You could use Models.NodeState here to match the internals of Textile
// But you'll have to deal with a few more possible states
type NodeStage = 'empty' | 'setup' | 'starting' | 'started'
type State = {
  api_version: string
  current_app_state: string
  node_state: Models.NodeState,
  overview: Models.Overview
  peer_id: string
  previous_app_state: string
  stage: NodeStage
}
export default class App extends Component<Props> {
  state = {
    api_version: 'unknown',
    current_app_state: 'active',
    node_state: 'nonexistent',
    overview: {
      account_peer_cnt: -1,
      thread_cnt: -1,
      file_cnt: -1,
      contact_cnt: -1
    },
    peer_id: 'unknown',
    previous_app_state: 'unknown',
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
      const previous_app_state = this.state.current_app_state
      this.setState({current_app_state: payload.nextState, previous_app_state})
    })

    // Listen for node state changes
    DeviceEventEmitter.addListener('@textile/newNodeState', (payload) => {
      this.setState({node_state: payload.state})
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
        <Text style={styles.heading}>Mobile IPFS Peer</Text>
        <Text style={styles.subheading}
              onPress={() => Linking.openURL('https://textile.io')}>
          Powered by Textile
        </Text>
        <Text style={styles.item}>API Version: {this.state.api_version}</Text>
        <Text style={styles.item}>Node State: {this.state.node_state}</Text>
        <Text style={styles.item}>Peer ID: {this.state.peer_id.substring(0, 12)}...</Text>
        <Text style={styles.item}>Pin Count: {this.state.overview.file_cnt}</Text>
        <Text style={styles.item}>App Status: {this.state.current_app_state}</Text>
        <Text style={styles.item}>Previous App Status: {this.state.previous_app_state}</Text>
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
  item: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
