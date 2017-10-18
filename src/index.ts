import * as rx from "rxjs";
/**A subject that execute the given thunk on the first subscription */
class ThunkSubjectClass<T>
    extends rx.BehaviorSubject<T | Promise<T>>
    implements ThunkSubject<T> {
    constructor(thunk: () => Promise<T>) {
        super(null as any);
        this.thunk = thunk;
    }
    private thunk: () => Promise<T>;
    private firstCall:boolean = true;


    protected _subscribe(o: rx.Subscriber<T | Promise<T>>) {
        //Force the first value to be getted
        this.lastValue();
        return super._subscribe(o);
    }

    next(value: T | Promise<T>) {
        super.next(value);
    }

    /**Refresh the subject value with a promise value*/
    refresh() {
        super.next(this.thunk());
    }

    /**Gets the last value of the thunk subject */
    lastValue() : T | Promise<T> {
        if (this.firstCall) {
            const value = this.thunk();
            this.next(value);
            this.firstCall = false;
            return value;
        } else {
            return this.value;
        }
    }

    /**Refresh the subject value with a non- */
    async refreshAsync() {
        super.next(await this.thunk());
    }
}

/**
/**A subject that execute the given thunk on the first subscription 
 */
export interface ThunkSubject<T> extends rx.Observable<T | Promise<T>> {
    /**Refresh the subject value with a promise value, the observers will receive the promise as is*/
    refresh();
    /**Refresh the subject value with a non-promise value, the observers will receive the resolved value */
    refreshAsync(): Promise<void>;
}

/**
/**Crate a subject that executes the given thunk at the first subscription and on refresh calls
 */
export function thunkSubject<T>(thunk : () => Promise<T>) : ThunkSubject<T> {
    return new ThunkSubjectClass<T>(thunk);
}