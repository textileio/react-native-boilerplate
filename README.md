# React Native IPFS boilerplate based off Textile

---
**Deprecation Warning**

Textile Threads v1 are being deprecated. Please follow our ongoing work on v2 on both the [go-threads repo](https://github.com/textileio/go-threads). 

Until any future Threads v2 integration, this repo should be used for experimental purposes only.

---

A basic boilerplate for creating, starting, and managing an IPFS peer using Textile's [React Native SDK](https://github.com/textileio/react-native-sdk).

If you are looking for a more advanced example, see our [Advanced Boilerplate](https://github.com/textileio/advanced-react-native-boilerplate/tree/master) that contains `react-navigation`, redux, and sagas together with Textile.

This app demonstrates the bare minimum steps to launch a Textile node to manage an IPFS peer in a mobile app. Those steps are roughly,

1. Initialize an instance of the Textile class.
2. Create and start a Textile node.
3. Use the local Textile API to request data from the peer.
4. Use events to tell the node about app state changes (background events)

### Getting Started

Clone this repo:

```
git clone git@github.com:textileio/react-native-boilerplate.git
cd react-native-boilerplate
```

Install dependencies:

```
yarn link
```

Launch bundle server

```
react-native start
```

Launch ios/android app

```
react-native run-ios
```

### Success

Should look like this,

![demo](https://ipfs.io/ipfs/Qme5NdF5qVLFYDxuPLENDsK8KStuU4CsLLeVpQSFEfd6LQ)

#### Issues

Please add any issues to the [react-native-sdk repo](https://github.com/textileio/react-native-sdk).
