# redux-wait-for-ssr
Redux middleware which provides an action that returns a promise that either:
* resolves when specified actions have occurred
* rejects when a given timeout has passed (default: 10s)
* optionally rejects when a given error action has occurred

### Use case:
When using Redux on the server-side (for SEO and performance purposes), you'll very likely want to prefetch some data to prepopulate the state when rendering the initial html markup of the requested page. A typical pattern for this is to dispatch the needed api calls from a static `fetchData` (or `getInitialProps`) method on the page component, which is first called on the server-side, and possibly again in `componentDidMount` for soft route changes.

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

However that doesn't yet solve waiting for the api call to actually complete. This library helps with that by offering a Redux action that you can **async/await** in the `fetchData` method so that the server-side will wait for the asynchronous action to complete, before entering the render() method.

### API signature:

`waitFor(actions, timeout, errorAction)`


| Parameter        | Type             | Optional         | Meaning            |
| ---------------- | ---------------- | ---------------- | ---------------- |
| actions          | array of strings | no               | to specify Redux action(s) which have to occur before the promise is resolved, conceptually similar to `Promise.all()`. |
| timeout          | number           | yes              | auto-rejects after timeout, defaults to `10000` milliseconds |
| errorAction      | string           | yes              | a Redux action to immediately reject on |

Returns a promise

### Example usage:

```js
import { waitFor } from 'redux-wait-for-ssr'

class PageComponent extends React.Component {
  static async fetchData ({ dispatch }) {

    dispatch(actions.FETCH_CONTENT)

    await dispatch(waitFor([actions.FETCH_CONTENT_RESOLVED])) // <- multiple actions allowed!
  }
  
  componentDidMount () {
    if (!this.props.contentLoaded) {
      this.props.dispatch(actions.FETCH_CONTENT)
    }
  }
}
```
Note:

* It doesn't really matter which other middleware you're using, thunks, sagas or epics, as long as you dispatch a new action after the side-effect has completed, you can "wait for it".
* If you're a Next.js user, see usage below!

### Error Handling:

In order to prevent hanging promises on the server-side, the promise is auto-rejected after a set timeout of 10 seconds.
You can change this with the `timeout` parameter: `waitFor([actions], 1000)`.

With the `errorActoin` parameter you can specify an error action that would immediately reject the promise if it occurs.

Using a **try/catch** block you could handle these rejections gracefully:

```js
import { waitFor } from 'redux-wait-for-ssr'

class PageComponent extends React.Component {
  static async fetchData ({ dispatch }) {

    dispatch(actions.FETCH_CONTENT)

    try {
      await dispatch(waitFor([actions.FETCH_CONTENT_RESOLVED], 1000, actions.FETCH_CONTENT_REJECTED)) // <- multiple actions allowed!
    } catch (e) {
      // handle error gracefully, for example return a 404 header
    }
  }
  
  componentDidMount () {
    if (!this.props.contentLoaded) {
      this.props.dispatch(actions.FETCH_CONTENT)
    }
  }
}
```

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
    applyMiddleware(createWaitForMiddleware().middleware),
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
      await reduxStore.dispatch(waitFor([actions.FETCH_CONTENT_RESOLVED]))
    }

    return {} // Still useable to return whatever you want as pageProps
  }
}
```

Since `getInitialProps` is re-used for soft url changes as well, the above is sufficient to implement data fetching for both the client and server. The `selectors.isContentLoaded` Redux selector is something you need to implement yourself, it could be as simple as:

```js
export const isContentLoaded(state: StoreState): boolean => {
   return state.content.isLoaded;
}
```

And in the reducer you would set `state.content.isLoaded` to true when the `actions.FETCH_CONTENT_RESOLVED` event has occurred:

```js
export function reducers(state: StoreState, action: Actions): StoreState {
    switch (action.type) {
        case constants.FETCH_CONTENT_RESOLVED: {
            state = {
                ...state,
                content: {
                    data: action.response,
                    isLoaded: true
                }
            }
            return state
        }
    }
}
```


This way you can keep track of requests that have been resolved in the state.

Note the above example is pure illustrative, your mileage may vary.
