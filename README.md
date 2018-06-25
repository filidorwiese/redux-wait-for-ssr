# redux-wait-for-ssr
Redux middleware returning a promise that resolves when specified actions have occurred.

When using Redux on the server-side, you'll very likely want to prefetch some data to prepoluate the state when rendering the initial html markup of the page.

A typical pattern for this is to dispatch the needed api calls from a static `fetchData` method on the page component, which is called on the server-side, and again in `componentDidMount` for soft route changes. Roughly, this pattern looks like: 

```js
class PageComponent extends React.Component {
  static fetchData ({ dispatch }) {
    dispatch(actions.FETCH_CONTENT)
  }
  
  componentDidMount () {
    if (!this.props.contentLoaded) {
      dispatch(actions.FETCH_CONTENT)
    }
  }
}
```

However that doesn't yet solve waiting for the api call to actually complete. This library helps with that by offering an action that you can async/await in the `fetchData` method (or `getInitialProps` if you're a Next.js user).

### Example usage:

```js
import { waitFor } from 'redux-wait-for-ssr'

class PageComponent extends React.Component {
  static async fetchData ({ dispatch }) {

    dispatch(actions.FETCH_CONTENT)

    await dispatch(waitFor([constants.FETCH_CONTENT_RESOLVED]))
  }
  
  componentDidMount () {
    if (!this.props.contentLoaded) {
      dispatch(actions.FETCH_CONTENT)
    }
  }
}
```

It doesn't really matter if you're using thunk, sagas or epics, as long as you dispatch a separate action after the side-effect has completed, you can "wait for it".
Also notice the parameter given to `waitFor()` is an array of strings, you can specify multiple actions which all have to occur before the promise is resolved!

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
