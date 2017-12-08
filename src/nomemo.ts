import * as rx from "rxjs";
import { Subscription } from "rxjs";
import { ThunkSubject, ThunkState } from "./types";
/**A subject that execute the given thunk on the first subscription. This class does not implement memoization, always calls the thunk on subscription and invalidation */
export class ThunkSubjectClassNoMemo<T>
    extends rx.Subject<T>
    implements ThunkSubject<T> {
    constructor(thunk: () => Promise<T>) {
        super();
        this.thunk = thunk;
    }
    private thunk: () => Promise<T>;

    protected _subscribe(o: rx.Subscriber<T>) {
        //Force the first value to be getted
        this.thunk().then(x => o.next(x));
        return super._subscribe(o);
    }

    async invalidate() {
        this.next(await this.thunk());
    }

    async current(): Promise<T> {
        return await this.thunk();
    }
}
