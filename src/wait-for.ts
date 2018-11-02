import { AnyAction, Dispatch, Store } from 'redux'

export const WAIT_FOR_ACTIONS = 'WAIT_FOR_ACTIONS'
export type WAIT_FOR_ACTIONS = typeof WAIT_FOR_ACTIONS

export type ActionType = string

export type ActionTypes = ActionType[]

export interface WaitForPromise {
  deferred: Deferred
  actions: ActionTypes
  errorTimeout: number
}

export interface WaitFor {
  type: WAIT_FOR_ACTIONS,
  actions: ActionType | ActionTypes,
  timeout: number
}

export function waitFor(actions: ActionType | ActionTypes, timeout: number = 10000): WaitFor {
  return {
    type: WAIT_FOR_ACTIONS,
    actions: Array.isArray(actions) ? actions : [actions],
    timeout
  }
}

export class Deferred {
  public promise: Promise<void>
  public reject: (reason: string) => void
  public resolve: () => void

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject
      this.resolve = resolve
    })
  }
}

export default () => {
  const promisesList: WaitForPromise[] = []

  const middleware = (_: Store) => (next: Dispatch<AnyAction>) => (action: AnyAction): Promise<void> | undefined => {
    // Loop promises to see if current action fullfills it
    for (let ii = 0; ii < promisesList.length; ii++) {
      promisesList[ii].actions = promisesList[ii].actions.filter((a) => a !== action.type)

      // No more actions? Resolve
      if (!promisesList[ii].actions.length) {
        clearTimeout(promisesList[ii].errorTimeout)
        promisesList[ii].deferred.resolve()
        promisesList.splice(ii, 1)
      }
    }

    next(action)

    // Create waitFor promise
    if (action.type === WAIT_FOR_ACTIONS) {
      const deferred = new Deferred()
      const waitingFor = {
        deferred,
        actions: action.actions,
        errorTimeout: setTimeout(() => {
          const reason = `Redux-wait-for-ssr: ${action.actions} did not resolve within timeout of ${action.timeout}ms`
          if (typeof console !== 'undefined') { console.warn(reason) }
          deferred.reject(reason)
        }, action.timeout)
      }

      promisesList.push(waitingFor)

      return waitingFor.deferred.promise
    }
  }

  return { middleware, promisesList }
}
