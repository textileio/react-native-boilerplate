import React from 'react';
import {Component} from 'react';
import * as RNFS from 'react-native-fs';
import { DeviceEventEmitter, StyleSheet, Text, View, Linking, TouchableOpacity } from 'react-native';

import {Textile, NodeState, Overview, ThreadInfo, BlockInfo, Events} from '@textile/react-native-sdk';
import { IMobilePreparedFiles } from '@textile/react-native-protobufs';

type Props = {};

// You could use Models.NodeState here to match the internals of Textile
// But you'll have to deal with a few more possible states
type State = {
  api_version: string
  current_app_state: string
  node_state: NodeState,
  overview: Overview
  peer_id: string
  previous_app_state: string
  recentPinHash: string
  threads: Array<string>
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
    recentPinHash: 'none',
    stage: 'empty',
    threads: []
  }

  textile = new Textile({debug: true})
  textileEvents = new Events()

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.node_state !== prevState.node_state) {
      switch (this.state.node_state) {
        case NodeState.started:
          console.info('axh Textile running -- checking version');
          this.getAPIVersion()
          this.getPeerId()
          this.refreshLocalThreads()

          // No need for a helper
          this.textile.overview().then((result: Overview) => {
            this.setState({
              overview: result
            })
          })
          break;
        default:
          break;
      }
    }
    if (this.state.threads.length !== prevState.threads.length) {
      this.textile.overview().then((result: Overview) => {
        this.setState({
          overview: result
        })
      })
    }
  }

  componentDidMount() {
    // We'll ad a listener so we can display updates issued by the AppStateEventHandler
    this.textileEvents.addListener('appNextState', (payload) => {
      console.info('@textile/appNextState', payload.nextState)
      const previous_app_state = this.state.current_app_state
      this.setState({current_app_state: payload.nextState, previous_app_state})
    })
    
    this.textileEvents.addListener('newNodeState', (payload) => {
      console.info('@textile/newNodeState', payload.state)
      this.setState({node_state: payload.state})
    })

    this.textileEvents.addListener('error', (payload) => {
      console.info('@textile/error', payload.type, payload.message)
    })
    
    this.createDemoFile()

    this.textile.setup({
      RELEASE_TYPE: 'beta',
      TEXTILE_CAFE_GATEWAY_URL: "https://gateway.textile.cafe",
      TEXTILE_CAFE_OVERRIDE: undefined
    })
  }
  createDemoFile = () => {
    // Store a small image for testing pins later
    RNFS.downloadFile({fromUrl:'https://ipfs.textile.io:5050/ipfs/QmT3jRTd57HrM4K5cCNkSk9uQidjLrZPAnKe8V9oxfX2Bp', toFile: `${RNFS.DocumentDirectoryPath}/textile.png`})
  }

  // Gets a map of Thread IDs into our local state
  refreshLocalThreads () {
    this.textile.threads().then((result: ReadonlyArray<ThreadInfo>) => {
      this.setState({
        threads: result.map((threadInfo) => threadInfo.id)
      })
    })
  }
  
  // Gets the API version running in Textile
  getAPIVersion() {
    // You can run the api object right on your textile instance
    this.textile.version().then((result: string) => {
      this.setState({api_version: result})
    }).catch((error: Error) => {
      console.error(error)
    })
  }

  // Get the local node's PeerId
  getPeerId() {
    this.textile.peerId().then((result: string) => {
      this.setState({peer_id: result})
    }).catch((error: Error) => {
      console.error(error)
    })
  }

  // Clear the state
  componentWillUnmount () {
    this.textile.tearDown()
  }
  
  // Not safe to use in a production app
  fake_uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Create a new Thread for writing files to. Read more about threads on https://github.com/textileio/textile-go/wiki
  createThread = () => {
    const key = `textile-ipfs-demo-${this.fake_uuid()}`
    this.textile.addThread(key, `Thread #${this.state.threads.length}`, true).then((result: ThreadInfo) => {
      this.setState({
        threads: [...this.state.threads, result.id]
      })
    })
  }

  // Add the basic text file we created during the setup() step to IPFS
  addNewPin = () => {
    if (this.state.overview.thread_cnt < 1) {
      return
    }
    this.textile.prepareFilesAsync(`${RNFS.DocumentDirectoryPath}/textile.png`, this.state.threads[0])
      .then((result: IMobilePreparedFiles) => {
        const dir = result.dir
        if (!dir) {
          return
      }
      this.textile.addThreadFiles(dir, this.state.threads[0], '')
        .then((result: BlockInfo) => {
          this.setState({
            recentPinHash: result.id
          })
          this.textile.overview().then((result: Overview) => {
            this.setState({
              overview: result
            })
          })
      })
    })
  }

  // Simple logic to toggle the node on and off again
  toggleNode = () => {
    if (this.state.node_state === 'stopped') {
      this.textile.createAndStartNode()
    } else if (this.state.node_state === 'started') {
      this.textile.shutDown()
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Your IPFS Peer</Text>
        <Text style={styles.subheading}
              onPress={() => Linking.openURL('https://textile.io')}>
          Powered by Textile
        </Text>
        <View style={styles.itemList}>
          <Text style={styles.item}>API Version: {this.state.api_version}</Text>
          <Text style={styles.item}>Node State: {this.state.node_state}</Text>
          <Text style={styles.item}>Peer ID: {this.state.peer_id && this.state.peer_id.substring(0, 12)}...</Text>
          <Text style={styles.item}>Pin Count: {this.state.overview.file_cnt}</Text>
          <Text style={styles.item}>Thread Count: {this.state.overview.thread_cnt}</Text>
          <Text style={styles.item}>App Status: {this.state.current_app_state}</Text>
          <Text style={styles.item}>Previous App Status: {this.state.previous_app_state}</Text>
        </View>
        {this.toggleNodeButton()}
        {this.createThreadButton()}
        {this.newPinButton()}
          <Text style={styles.smallItem}>{this.state.recentPinHash}</Text>
      </View>
    );
  }

  toggleNodeButton() {
    return (
      <View>
        <TouchableOpacity
          onPress={this.toggleNode}
        >
          <Text style={styles.button}>Toggle Node</Text>
        </TouchableOpacity>
      </View>
    )
  }

  createThreadButton() {
    const disabled = this.state.node_state !== 'started'
    return (
      <View>
        <TouchableOpacity
          onPress={this.createThread}
          disabled={disabled}
        >
          <Text style={[styles.button, disabled && styles.disabled]}>Create Thread</Text>
        </TouchableOpacity>
      </View>
    )
  }

  newPinButton() {
    const disabled = this.state.node_state !== 'started' || this.state.overview.thread_cnt < 1
    return (
      <View>
        <TouchableOpacity
          onPress={this.addNewPin}
          disabled={disabled}
        >
          <Text style={[styles.button, disabled && styles.disabled]}>Pin File</Text>
        </TouchableOpacity>
      </View>
    )
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
  button: {
    margin: 14,
    color: '#FF1C3F',
  },
  disabled: {
    color: '#FFB6D5'
  },
  itemList: {
    margin: 10,
  },
  item: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  smallItem: {
    textAlign: 'center',
    color: '#FFB6D5',
    marginBottom: 5,
    fontSize: 8,
  },
});
