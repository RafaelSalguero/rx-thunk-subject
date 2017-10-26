import * as rx from "rxjs";

type ThunkState = "valid" | "invalid" | "running" | "error";
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
    private currentPromise: Promise<T> | undefined = undefined;
    /**Valor actual, sólo es valido si hasCurrentValue */
    private currentValue: T | undefined = undefined;
    private hasCurrentValue: boolean = false;
    /**Version de la ultima invalidación del cache */
    private invalidAsyncVersion: number = 0;

    protected _subscribe(o: rx.Subscriber<T>) {
        //Force the first value to be getted
        this.refreshValidation(true);
        if (this.hasCurrentValue && this.state != "running") {
            o.next(this.currentValue!);
        }
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
        try {
            this.currentPromise = this.thunk();
            const value = await this.currentPromise;

            //checamos que la version del cache invalidado continue siendo la misma
            if (this.invalidAsyncVersion == version) {
                this.currentValue = value;
                this.hasCurrentValue = true;
                this.state = "valid";
                this.next(value);
            }
        } catch (error) {
            this.state = "error";
            this.error(error);
        }

    }

    async current(): Promise<T> {
        if (this.currentPromise) {
            return this.currentPromise;
        } else {
            this.forceValidateAsync();
            return this.currentPromise!;
        }
    }
}

/**
/**A subject that execute the given thunk on the first subscription 
 */
export interface ThunkSubject<T> extends rx.Observable<T> {
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
/**Crate a subject that executes the given thunk at the first subscription and on refresh calls
 */
export function thunkSubject<T>(thunk: () => Promise<T>): ThunkSubject<T> {
    return new ThunkSubjectClass<T>(thunk);
}