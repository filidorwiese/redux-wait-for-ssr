import { AnyAction, Dispatch, Store } from 'redux'

export const WAIT_FOR_ACTIONS = 'WAIT_FOR_ACTIONS'
export type WAIT_FOR_ACTIONS = typeof WAIT_FOR_ACTIONS

export type ActionType = string

export type ActionTypes = ActionType[]

export interface WaitForPromise {
  deferred: Deferred
  actions: ActionTypes
  timeout: any,
  errorAction: ActionType
}

export interface WaitFor {
  type: WAIT_FOR_ACTIONS,
  actions: ActionType | ActionTypes,
  timeout: number,
  errorAction?: ActionType
}

export function waitFor(
  actions: ActionType | ActionTypes,
  timeout: number = 10000,
  errorAction?: ActionType
): WaitFor {
  return {
    type: WAIT_FOR_ACTIONS,
    actions: Array.isArray(actions) ? actions : [actions],
    timeout,
    errorAction
  }
}

export class Deferred {
  public promise: Promise<void>
  public reject: (reason: string) => void
  public resolve: () => void

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.reject = (reason: string) => {
        if (typeof console !== 'undefined') { console.warn(reason) }
        reject(reason)
      }
      this.resolve = resolve
    })
  }
}

export default () => {
  const promisesList: WaitForPromise[] = []

  const removePromiseFromList = (index: number) => {
    clearTimeout(promisesList[index].timeout)
    promisesList.splice(index, 1)
  }

  const middleware = (_: Store) => (next: Dispatch<AnyAction>) => (action: AnyAction): Promise<void> | undefined => {
    // Loop promises to see if current action fullfills it
    for (let ii = 0; ii < promisesList.length; ii++) {
      promisesList[ii].actions = promisesList[ii].actions.filter((a) => a !== action.type)

      // Reject if the error action occurred
      if (promisesList[ii] && promisesList[ii].errorAction && action.type === promisesList[ii].errorAction) {
        promisesList[ii].deferred.reject(`Redux-wait-for-ssr: rejected because ${action.type} occurred`)
        removePromiseFromList(ii)
      }

      // No more actions? Resolve
      if (promisesList[ii] && !promisesList[ii].actions.length) {
        promisesList[ii].deferred.resolve()
        removePromiseFromList(ii)
      }

    }

    next(action)

    // Create waitFor promise
    if (action.type === WAIT_FOR_ACTIONS) {
      const deferred = new Deferred()

      const timeoutFn = setTimeout(() => {
        deferred.reject(`Redux-wait-for-ssr: ${action.actions} did not resolve within timeout of ${action.timeout}ms`)
      }, action.timeout)

      const waitingFor = {
        deferred,
        actions: action.actions,
        timeout: timeoutFn,
        errorAction: action.errorAction
      }

      promisesList.push(waitingFor)

      return waitingFor.deferred.promise
    }
  }

  return { middleware, promisesList }
}
