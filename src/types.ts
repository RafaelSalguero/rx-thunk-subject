import * as rx from "rxjs";
export type ThunkState = "valid" | "invalid" | "running" | "error";

/**
/**A subject that execute the given thunk on the first subscription 
 */
export interface ThunkSubjectMemo<T> extends rx.Observable<T> {
    /**
     * Force the reevaluation of the thunk function
     * If there are any subscriptions, evaluate the thunk, await the result pass the promise value to the subscribers, 
     * if there isn't any subscriptions, mark the subject as invalidAsync and executes then awaits the thunk on the next subscription.
     * Subscribers will receive the new fresh solved value */
    invalidate(): Promise<void>;

    /**
     * Get the current value as a promise. If the thunk has never been called this calls the thunk and return the thunk promise
     */
    current(): Promise<T>;
}


/**
/**A subject that execute the given thunk on the first subscription 
 */
export interface ThunkSubject<T> extends rx.Observable<T> {
    /**
     * Call the thunk and report its result to all subscribers
     */
    invalidate(): Promise<void>;

    /**
     * Call the thunk and return its result
     */
    current(): Promise<T>;
}
