import React from 'react';
import {Component} from 'react';
import * as RNFS from 'react-native-fs';
import { StyleSheet, Text, View, Linking, TouchableOpacity } from 'react-native';

import { Textile, API, NodeState, Events as TextileEvents, pb} from '@textile/react-native-sdk';
type Props = {};

// You could use Models.NodeState here to match the internals of Textile
// But you'll have to deal with a few more possible states
type State = {
  api_version: string
  current_app_state: string
  node_state: NodeState,
  summary: pb.ISummary
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
    summary: new pb.Summary(),
    peer_id: 'unknown',
    previous_app_state: 'unknown',
    recentPinHash: 'none',
    stage: 'empty',
    threads: []
  }

  textile = new Textile({debug: true})
  events = new TextileEvents()
  
  componentDidUpdate(prevProps: Props, prevState: State) {
    if (this.state.node_state !== prevState.node_state) {
      switch (this.state.node_state) {
        case NodeState.started:
          console.info('axh Textile running -- checking version');
          this.getAPIVersion()
          this.getPeerId()
          this.refreshLocalThreads()

          // No need for a helper
          this.updateSummary()
          break;
        default:
          break;
      }
    }
    if (this.state.threads.length !== prevState.threads.length) {
      this.updateSummary()
    }
  }

  componentDidMount() {
    // We'll ad a listener so we can display updates issued by the AppStateEventHandler
    this.events.addListener('appNextState', (payload) => {
      console.info('@textile/appNextState', payload.nextState)
      const previous_app_state = this.state.current_app_state
      this.setState({current_app_state: payload.nextState, previous_app_state})
    })
    this.events.addListener('NODE_STOP', () => {
      console.info('@textile/NODE_STOP')
    })
    this.events.addListener('NODE_START', () => {
      console.info('@textile/NODE_START')
    })
    this.events.addListener('newNodeState', (payload) => {
      console.info('@textile/newNodeState', payload.state)
      this.setState({node_state: payload.state})
    })

    this.events.addListener('error', (payload) => {
      console.info('@textile/error', payload.type, payload.message)
    })
    
    this.createDemoFile()

    this.textile.setup()
      .catch((error: Error) => {
        console.error('Textile.setup', error.message)
      })
  }
  createDemoFile = () => {
    // Store a small image for testing pins later
    const { promise } = RNFS.downloadFile({fromUrl:'https://ipfs.io/ipfs/QmT3jRTd57HrM4K5cCNkSk9uQidjLrZPAnKe8V9oxfX2Bp', toFile: `${RNFS.DocumentDirectoryPath}/textile.png`})
    promise.catch((error: Error) => {
      console.error('RNFS.downloadFile', error.message)
    })
  }

  // Gets a map of Thread IDs into our local state
  refreshLocalThreads () {
    API.threads.list().then((threadList: pb.IThreadList) => {
      this.setState({
        threads: threadList.items.map((threadInfo) => threadInfo.id)
      })
    }).catch((error: Error) => {
      console.error('API.threads.list', error.message)
    })
  }
  
  // Gets the API version running in Textile
  getAPIVersion() {
    // You can run the api object right on your textile instance
    API.version().then((api_version: string) => {
      this.setState({api_version})
    }).catch((error: Error) => {
      console.error('API.version', error.message)
    })
  }

  // Get the local node's PeerId
  getPeerId() {
    API.ipfs.peerId().then((peer_id: string) => {
      this.setState({peer_id})
    }).catch((error: Error) => {
      console.error('API.ipfs.peerId', error.message)
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
    const schema = pb.AddThreadConfig.Schema.create()
    schema.preset = pb.AddThreadConfig.Schema.Preset.MEDIA
    const config = pb.AddThreadConfig.create()
    config.key = key
    config.name = `Thread #${this.state.threads.length}`
    config.type = pb.Thread.Type.PRIVATE
    config.sharing = pb.Thread.Sharing.INVITE_ONLY
    config.schema = schema

    API.threads.add(config).then((result: pb.IThread) => {
      this.setState({
        threads: [...this.state.threads, result.id]
      })
    }).catch((error: Error) => {
      console.error('API.threads.add', error.message)
    })
  }

  // Add the basic text file we created during the setup() step to IPFS
  addNewPin = () => {
    if (this.state.summary.threadCount < 1) {
      return
    }
    API.files.prepareFilesByPath(`${RNFS.DocumentDirectoryPath}/textile.png`, this.state.threads[0])
      .then((result: pb.IMobilePreparedFiles) => {
        const dir = result.dir
        if (!dir) {
          return
      }
      API.files.add(dir, this.state.threads[0], '')
        .then((result: pb.IBlock) => {
          this.setState({
            recentPinHash: result.id
          })
          this.updateSummary()
        }).catch((error: Error) => {
          console.error('API.files.add', error.message)
        })
      }).catch((error: Error) => {
        console.error('API.files.prepareFilesByPath', error.message)
      })
  }

  updateSummary = () => {
    API.summary().then((summary: pb.ISummary) => {
      this.setState({
        summary
      })
    }).catch((error: Error) => {
      console.error(error.message)
    })
  }
  // Simple logic to toggle the node on and off again
  toggleNode = () => {
    if (this.state.node_state === 'stopped') {
      this.textile.nodeCreateAndStart()
      .catch((error: Error) => {
        console.error('Textile.nodeCreateAndStart', error.message)
      })
    } else if (this.state.node_state === 'started') {
      API.stop()
      .catch((error: Error) => {
        console.error('API.stop', error.message)
      })
    }
  }

  render() {
    // TODO: {this.toggleNodeButton()}
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
          <Text style={styles.item}>Pin Count: {this.state.summary.fileCount}</Text>
          <Text style={styles.item}>Thread Count: {this.state.summary.threadCount}</Text>
          <Text style={styles.item}>App Status: {this.state.current_app_state}</Text>
          <Text style={styles.item}>Previous App Status: {this.state.previous_app_state}</Text>
        </View>
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
    const disabled = this.state.node_state !== 'started' || this.state.summary.thread_cnt < 1
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
