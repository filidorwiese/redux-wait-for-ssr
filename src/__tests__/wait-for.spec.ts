import configureStore from 'redux-mock-store'
import createWaitForMiddleware, {waitFor} from '../wait-for'

jest.setTimeout(1000)

describe('Action', () => {
  it('should provide Redux waitFor action', () => {
    expect(waitFor(['action1', 'action2'])).toEqual({
      actions: ['action1', 'action2'],
      type: 'WAIT_FOR_ACTIONS'
    })
  })

  it('should accepts a string as single action', () => {
    expect(waitFor('action1')).toEqual({
      actions: ['action1'],
      type: 'WAIT_FOR_ACTIONS'
    })
  })
})

describe('Middleware', () => {
  it('should return Redux middleware', () => {
    const waitForMiddleware = createWaitForMiddleware()
    expect(typeof waitForMiddleware.middleware).toBe('function')
  })

  it('should wait for actions to occur', (done) => {
    const waitForMiddleware = createWaitForMiddleware()
    const middlewares = [waitForMiddleware.middleware]
    const mockStore = configureStore(middlewares)
    const store = mockStore({})

    const promise = store.dispatch(waitFor(['action1', 'action2']))
    expect(waitForMiddleware.promisesList.length).toBe(1)

    store.dispatch({
      type: 'action1'
    })
    store.dispatch({
      type: 'action2'
    })

    promise.then(() => {
      expect(waitForMiddleware.promisesList).toEqual([])
      done()
    })
  })
})
