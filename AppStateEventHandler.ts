import { AppState, AppStateStatus, DeviceEventEmitter } from 'react-native'


export default class AppStateEventHandler {

  constructor() {
    this.setup()
  }

  handleAppState (nextState: AppStateStatus) {
    // You can send asynchronous events to your Textile instance
    DeviceEventEmitter.emit('@textile/appNextState', {nextState})
  }

  setup () {
    AppState.addEventListener('change', this.handleAppState.bind(this))
  }

  tearDown () {
    AppState.removeEventListener('change', this.handleAppState.bind(this))
  }
}
