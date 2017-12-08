import * as rx from "rxjs";
import { ThunkSubjectClassMemo } from "./memo";
import { ThunkSubjectClassNoMemo } from "./nomemo";
import { ThunkSubjectMemo, ThunkSubject } from "./types";

export { ThunkSubject, ThunkSubjectMemo };

/**
/**Crate a subject that executes the given thunk at the first subscription and on invalidate calls
 */
export function thunkSubjectMemo<T>(thunk: () => Promise<T>): ThunkSubjectMemo<T> {
    return new ThunkSubjectClassMemo<T>(thunk);
}

/**Create a new subject that always executes the given thunk, on all subscriptions and on invalidate calls */
export function thunkSubject<T>(thunk: () => Promise<T>): ThunkSubject<T> {
    return new ThunkSubjectClassNoMemo<T>(thunk);
}