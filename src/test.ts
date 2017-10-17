import { thunkSubject } from "./index";
import * as expect from "expect";

let counter = 1;
let llamadas = 0;
async function testThunk() {
    llamadas++;
    return new Promise<number>(resolve => {
        setTimeout(() => {
            resolve(counter);
            counter++;
        }, 100);
    });
}

(async () => {
    const subject = thunkSubject(testThunk);
    //Antes de llamar al testThunk no se ha aumentado el counter
    expect(llamadas).toBe(0);

    //La primera llamada
    {
        const counter = await await new Promise<Promise<number> | number>(resolve => subject.subscribe(resolve));
        expect(counter).toBe(1);
        expect(llamadas).toBe(1);
    }


    //Ya no genera mas llamadas
    {
        const counter = await await new Promise<Promise<number> | number>(resolve => subject.subscribe(resolve));
        expect(counter).toBe(1);
        expect(llamadas).toBe(1);
    }

    //creamos 2 subscriptores:
    let subA: number | Promise<number> = 0;
    let subB: number | Promise<number> = 0;

    subject.subscribe(x => subA = x);
    subject.subscribe(x => subB = x);

    //Obtienen el valor anterior, que es la promesa con el 1:
    expect(await subA).toBe(1);
    expect(await subB).toBe(1);

    //actualizamos el valor del subject con un valor que no es una promesa
    await subject.refreshAsync();

    expect(subA).toBe(2);
    expect(subB).toBe(2);

    //actualizamos el valor del subject con uno que es una promesa:
    subject.refresh();
    expect(await subA).toBe(3);
    expect(await subB).toBe(3);

    console.log("all test passed");
})();