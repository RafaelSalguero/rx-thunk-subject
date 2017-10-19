import * as rx from "rxjs";

type ThunkState = "valid" | "invalid" | "invalidAsync";
/**A subject that execute the given thunk on the first subscription */
class ThunkSubjectClass<T>
    extends rx.BehaviorSubject<T | Promise<T>>
    implements ThunkSubject<T> {
    constructor(thunk: () => Promise<T>) {
        super(null as any);
        this.thunk = thunk;
    }
    private thunk: () => Promise<T>;
    private state: ThunkState = "invalid";
    /**Version de la ultima invalidación del cache */
    private invalidAsyncVersion: number = 0;

    protected _subscribe(o: rx.Subscriber<T | Promise<T>>) {
        //Force the first value to be getted
        this.refreshValidation(true);
        return super._subscribe(o);
    }


    /**Refresh the subject value with a promise value if there are any subscriptors*/
    invalidate() {
        this.state = "invalid";
        this.refreshValidation(false);
    }

    async invalidateAsync() {
        this.state = "invalidAsync";
        await this.refreshValidation(false);
    }

    /**
     * Call the validation methods 
     * @param force Call even if there aren't any observers
     */
    private async refreshValidation(force: boolean) {
        if (this.observers.length > 0 || force) {
            switch(this.state) {
                case "invalid":
                    this.forceValidateSync();
                    break;
                case "invalidAsync":
                    await this.forceValidateAsync();
                    break;
            }
        }
    }

    private forceValidateSync() {
        const value = this.thunk();
        this.next(value);
        this.state = "valid";
    }

    private async forceValidateAsync() {
        const version = Math.random();
        this.invalidAsyncVersion = version;
        const value = await this.thunk();

        //checamos que la version del cache invalidado continue siendo la misma
        if (this.invalidAsyncVersion == version) {
            this.next(value);
            this.state = "valid";
        }
    }

}

/**
/**A subject that execute the given thunk on the first subscription 
 */
export interface ThunkSubject<T> extends rx.Observable<T | Promise<T>> {
    /**If there are any subscriptions, evaluate the thunk immediatly and pass the promise value to the subscribers, 
     * if there isn't any subscriptions, mark the subject as invalid and executes the thunk on the next subscription.
     * Subscribers will receive the promise of the value */
    invalidate();
    /**If there are any subscriptions, evaluate the thunk, await the result pass the promise value to the subscribers, 
     * if there isn't any subscriptions, mark the subject as invalidAsync and executes then awaits the thunk on the next subscription.
     * Subscribers will receive the solved value */
    invalidateAsync(): Promise<void>;
}

/**
/**Crate a subject that executes the given thunk at the first subscription and on refresh calls
 */
export function thunkSubject<T>(thunk: () => Promise<T>): ThunkSubject<T> {
    return new ThunkSubjectClass<T>(thunk);
}