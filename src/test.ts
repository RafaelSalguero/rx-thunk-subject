import { thunkSubject } from "./index";
import * as expect from "expect";
import * as rx from "rxjs";
function delay(ms: number) {
    return new Promise<number>(resolve => {
        setTimeout(() => {
            resolve(counter);
        }, ms);
    });
}

let counter = 0;
let llamadas = 0;
async function testThunk() {
    llamadas++;
    return new Promise<number>(resolve => {
        setTimeout(() => {
            counter++;
            resolve(counter);
        }, 100);
    });
}

(async () => {
    console.log("Probar que testThunk sólo sea llamado cuando existan subscriptores vigentes");
    const subject = thunkSubject(testThunk);
    //Antes de llamar al testThunk no se ha aumentado el counter
    expect(llamadas).toBe(0);

    //Si llamamos al refresh no se llama al testThunk, ya que no hay ningun subscriptor
    subject.invalidate();
    expect(llamadas).toBe(0);

    //La primera llamada
    {
        let subs: rx.Subscription = null as any;
        const counter = await await new Promise<Promise<number> | number>(resolve => subs = subject.subscribe(resolve));
        expect(counter).toBe(1);
        expect(llamadas).toBe(1);
        expect(counter).toBe(llamadas);
        subs.unsubscribe();
    }


    //Ya no genera mas llamadas
    {
        let subs: rx.Subscription = null as any;
        const counter = await await new Promise<Promise<number> | number>(resolve => subs = subject.subscribe(resolve));
        expect(counter).toBe(1);
        expect(llamadas).toBe(1);
        expect(counter).toBe(llamadas);
        subs.unsubscribe();
    }

    //creamos 2 subscriptores:
    let subA: number | Promise<number> = 0;
    let subB: number | Promise<number> = 0;

    const subscriptionA = subject.subscribe(x => subA = x);
    const subscriptionB = subject.subscribe(x => subB = x);

    //Obtienen el valor anterior, que es la promesa con el 1:
    expect(await subA).toBe(1);
    expect(await subB).toBe(1);
    expect(counter).toBe(llamadas);

    //actualizamos el valor del subject con un valor que no es una promesa
    await subject.invalidateAsync();
    expect(counter).toBe(llamadas);

    expect(subA).toBe(2);
    expect(subB).toBe(2);

    //actualizamos el valor del subject con uno que es una promesa:
    subject.invalidate();
    expect(await subA).toBe(3);
    expect(await subB).toBe(3);
    expect(counter).toBe(llamadas);

    //Eliminamos la subscriptionB
    subscriptionB.unsubscribe();

    //Actualizamos el valor de subject, sólo debe de actualizar subA
    await subject.invalidateAsync();
    expect(counter).toBe(llamadas);

    expect(await subA).toBe(4);
    expect(await subB).toBe(3);
    expect(counter).toBe(llamadas);

    //Eliminamos la subscripcionA
    subscriptionA.unsubscribe();
    expect(counter).toBe(llamadas);

    //Agregamos de nuevo la subscripcionA
    let subC: number | Promise<number> = 0;
    const subscriptionC = subject.subscribe(x => subC = x);

    //Debe de agarrar el valor anterior:
    expect(subC).toBe(4);
    expect(counter).toBe(llamadas);

    //Invalidamos el valor
    await subject.invalidateAsync();
    expect(counter).toBe(llamadas);

    //Se regeneró el valor
    expect(subC).toBe(5);
    expect(counter).toBe(llamadas);

    //Si quitamos la subscriocion no regenera el valor:
    subscriptionC.unsubscribe();

    expect(llamadas).toBe(5);
    subject.invalidate();
    //No realiza ninguna llamada ya que no hay subscriptores:
    expect(llamadas).toBe(5);

    //Agregamos un subscriptor, el cual va a generar una llamada ya que se marco como invalido el valor
    let subD: number | Promise<number> = 0;
    const subscriptionD = subject.subscribe(x => subD = x);
    //Al tener el nuevo subscriptor recibimos la llamada
    expect(llamadas).toBe(6);
    expect(await subD).toBe(6);

    subscriptionD.unsubscribe();

    //Realizamos el invalidado asincronom sin subscriptores, lo que ocasionará que no se realize la llamada hasta que se subcriba uno, pero el siguiente subscriptor tendra el valor tal cual, no la promesa sin resolver
    expect(llamadas).toBe(6);
    await subject.invalidateAsync();
    //No realiza ninguna llamada ya que no hay subscriptores:
    expect(llamadas).toBe(6);

    let subF: number | Promise<number> = 0;
    const subscriptionF = subject.subscribe(x => subF = x);
    //Al entrar el subscriptor realizó la llamada
    expect(llamadas).toBe(7);
    //Al subscriptor se le dio el valor anterior, ya que el nuevo valor aún se esta calculando
    expect(await subF).toBe(6);

    //esperamos a que termine 
    await delay(150);
    //Ahora si el subF tiene el valor mas reciente, y no es una promesa si no el valor tal cual
    expect(subF).toBe(7);

    console.log("all test passed");
})().then(x => {
}, x => {
    console.warn(x);
});