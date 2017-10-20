import * as rx from "rxjs";

type ThunkState = "valid" | "invalid" | "running";
/**A subject that execute the given thunk on the first subscription */
class ThunkSubjectClass<T>
    extends rx.Subject<T>
    implements ThunkSubject<T> {
    constructor(thunk: () => Promise<T>) {
        super();
        this.thunk = thunk;
    }
    private thunk: () => Promise<T>;
    private state: ThunkState = "invalid";
    /**Almacena la promesa del valor actual */
    private currentValue: Promise<T> | undefined = undefined;
    /**Version de la ultima invalidación del cache */
    private invalidAsyncVersion: number = 0;

    protected _subscribe(o: rx.Subscriber<T>) {
        //Force the first value to be getted
        this.refreshValidation(true);
        return super._subscribe(o);
    }


    async invalidate() {
        this.state = "invalid";
        await this.refreshValidation(false);
    }

    /**
     * Call the validation methods 
     * @param force Call even if there aren't any observers
     */
    private async refreshValidation(force: boolean) {
        if (this.observers.length > 0 || force) {
            switch (this.state) {
                case "invalid":
                    await this.forceValidateAsync();
                    break;
            }
        }
    }

    /**
     * Force the execution of the thunk and updates the currentValue field
     */
    private async forceValidateAsync() {
        const version = Math.random();
        this.invalidAsyncVersion = version;
        this.state = "running";
        this.currentValue = this.thunk();
        const value = await this.currentValue;

        //checamos que la version del cache invalidado continue siendo la misma
        if (this.invalidAsyncVersion == version) {
            this.next(value);
            this.state = "valid";
        }
    }

    async current(): Promise<T> {
        if (this.currentValue) {
            return this.currentValue;
        } else {
            this.forceValidateAsync();
            return this.currentValue!;
        }
    }
}

/**
/**A subject that execute the given thunk on the first subscription 
 */
export interface ThunkSubject<T> extends rx.Observable<T> {
    /**If there are any subscriptions, evaluate the thunk, await the result pass the promise value to the subscribers, 
     * if there isn't any subscriptions, mark the subject as invalidAsync and executes then awaits the thunk on the next subscription.
     * Subscribers will receive the solved value */
    invalidate(): Promise<void>;

    /**
     * Get the current value as a promise. If the thunk has never been called this calls the thunk and return the thunk promise
     */
    current(): Promise<T>;
}

/**
/**Crate a subject that executes the given thunk at the first subscription and on refresh calls
 */
export function thunkSubject<T>(thunk: () => Promise<T>): ThunkSubject<T> {
    return new ThunkSubjectClass<T>(thunk);
}