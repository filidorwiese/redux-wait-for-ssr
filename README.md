# redux-wait-for-ssr
Redux middleware returning a promise that resolves when specified actions have occurred.

When using Redux on the server-side (for SEO and performance purposes), you'll very likely want to prefetch some data to prepopulate the state when rendering the initial html markup of the requested page. A typical pattern for this is to dispatch the needed api calls from a static `fetchData` method on the page component, which is first called on the server-side, and possibly again in `componentDidMount` for soft route changes. 

Roughly, this pattern looks like: 

```js
class PageComponent extends React.Component {
  static fetchData ({ dispatch }) {
    dispatch(actions.FETCH_CONTENT)
  }
  
  componentDidMount () {
    if (!this.props.contentLoaded) {
      this.props.dispatch(actions.FETCH_CONTENT)
    }
  }
}
```

However that doesn't yet solve waiting for the api call to actually complete. This library helps with that by offering a Redux action that you can async/await in the `fetchData` method so that the server-side will wait for the asynchronous action to complete, before entering the render() method.

### Example usage:

```js
import { waitFor } from 'redux-wait-for-ssr'

class PageComponent extends React.Component {
  static async fetchData ({ dispatch }) {

    dispatch(actions.FETCH_CONTENT)

    await dispatch(waitFor([actions.FETCH_CONTENT_RESOLVED]))
  }
  
  componentDidMount () {
    if (!this.props.contentLoaded) {
      this.props.dispatch(actions.FETCH_CONTENT)
    }
  }
}
```
Some remarks:

* It doesn't really matter which other middleware you're using, thunk, sagas or epics, as long as you dispatch a new action after the side-effect has completed, you can "wait for it".
* Notice the parameter given to `waitFor()` is an array of strings, you can specify multiple actions which all have to occur before the promise is resolved, conceptually similar to `Promise.all()`.
* If you're a Next.js user, see usage below!

### Installation:
1. Download
```
npm install redux-wait-for-ssr --save
```

2. Apply middleware when creating the store:

```js
import createWaitForMiddleware from 'redux-wait-for-ssr'

function makeStore(initialState) {
  let enhancer = compose(
    // ...other middleware
    applyMiddleware(createWaitForMiddleware()),
    // ...even more middleware
  )
  return createStore(rootReducer, initialState, enhancer)
}
```

3. Make sure the static method is called on the server-side. How entirely depends on your setup, if you have no clue at this point, I suggest you look at [Next.js](https://github.com/zeit/next.js/) which simplifies SSR for React and is pretty awesome :metal:

### Next.js usage:
With Next.js you get SSR out-of-the-box. After you've implemented Redux and applied the `redux-wait-for-ssr` middleware, you could use it as follows:

```js
class IndexPage extends React.PureComponent {
  static async getInitialProps({reduxStore}) {
    const currentState = reduxStore.getState()
    
    // Prevents re-fetching of data
    const isContentLoaded = selectors.isContentLoaded(currentState)
    if (!isContentLoaded) {
      reduxStore.dispatch(actions.FETCH_CONTENT)
      await reduxStore.dispatch(waitFor(actions.FETCH_CONTENT_RESOLVED))
    }

    return {} // Still useable to return whatever you want as pageProps
  }
}
```

Since `getInitialProps` is re-used for soft url changes as well, the above is sufficient to implement data fetching for the client and server.
