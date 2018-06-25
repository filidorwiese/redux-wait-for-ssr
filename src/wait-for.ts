import { Store, Dispatch, Action, AnyAction } from 'redux'

export const WAIT_FOR_ACTIONS = 'WAIT_FOR_ACTIONS'
export type WAIT_FOR_ACTIONS = typeof WAIT_FOR_ACTIONS

export type Actions = Action | Action[]

export interface WaitForPromise {
  promise: Deferred;
  actions: Actions[];
}

export interface waitFor {
  type: WAIT_FOR_ACTIONS,
  actions: Actions
}

export function waitFor(actions: Actions): waitFor {
  return {
    type: WAIT_FOR_ACTIONS,
    actions
  }
}

export class Deferred {
  promise: Promise<void>
  reject: () => void
  resolve: () => void

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject
      this.resolve = resolve
    })
  }
}

export default () => {
  const promisesList: WaitForPromise[] = []

  return (store: Store) => (next: Dispatch<AnyAction>) => (action: AnyAction) => {
    // Loop promises to see if current action fullfills it
    for (let ii = 0; ii < promisesList.length; ii++) {
      promisesList[ii].actions = promisesList[ii].actions.filter(a => a !== action.type)

      // No more actions? Resolve
      if (!promisesList[ii].actions.length) {
        promisesList[ii].promise.resolve()
        promisesList.splice(ii, 1)
      }
    }

    next(action)

    // Create waitFor promise
    if (action.type === WAIT_FOR_ACTIONS) {
      const waitingFor = {
        promise: new Deferred(),
        actions: Array.isArray(action.actions) ? action.actions : [action.actions]
      }

      promisesList.push(waitingFor)

      return waitingFor.promise
    }
  }
}
