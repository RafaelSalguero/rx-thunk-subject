import { thunkSubjectMemo, thunkSubject } from "./index";
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
    /************************************************ */
    /**Probar ThunkNoMemo */
    /************************************************ */
    {
        console.log("Probar thunk NO memo");
        const sub = thunkSubject(testThunk);
        expect(llamadas).toBe(0);

        let sub1Counter = 0;
        let sub2Counter = 0;
        const sub1 = sub.subscribe(() => sub1Counter++);

        expect(llamadas).toBe(1);
        expect(sub1Counter).toBe(0);
        expect(counter).toBe(0);

        const sub2 = sub.subscribe(() => sub2Counter++);

        expect(llamadas).toBe(2);
        expect(counter).toBe(0);
        expect(sub2Counter).toBe(0);

        await delay(300);

        expect(counter).toBe(2);
        expect(sub1Counter).toBe(1);
        expect(sub2Counter).toBe(1);

        sub.invalidate();

        expect(llamadas).toBe(3);
        expect(counter).toBe(2);
        expect(sub1Counter).toBe(1);
        expect(sub2Counter).toBe(1);

        await delay(300);
        
        
        expect(llamadas).toBe(3);
        expect(counter).toBe(3);
        expect(sub1Counter).toBe(2);
        expect(sub2Counter).toBe(2);

        await sub.invalidate();

        expect(llamadas).toBe(4);
        expect(counter).toBe(4);
        expect(sub1Counter).toBe(3);
        expect(sub2Counter).toBe(3);
    }


    /************************************************ */
    /**Probar ThunkMemo */
    /************************************************ */

    counter = 0;
    llamadas = 0;

    {
        console.log("Probar que funciona el operador del mapeo");
        const thunk1 = () => delay(100).then(x => "Hola");
        const thunk2 = () => delay(1000).then(x => "Rafa");
        const subject1 = thunkSubjectMemo(thunk1);
        const subject2 = thunkSubjectMemo(thunk2);
        const obs = rx.Observable.combineLatest(subject1, subject2).map(x => x[0] + " " + x[1]);

        let r1;
        obs.subscribe(value => {
            r1 = value;
        });
        await delay(500);
        expect(r1).toBe(undefined);

        await delay(1200);
        expect(r1).toBe("Hola Rafa");
    }
    {
        console.log("Probar que una segunda subscripcion en un onNext obtenga el valor anteriormente calculado");
        const thunk = async () => "Hola";
        const subject = thunkSubjectMemo(thunk);

        let secondary: string = "";
        const primarySubscription = subject.subscribe(() => subject.subscribe(value => secondary = value));
        await delay(0);

        expect(secondary).toBe("Hola");
    }
    {
        console.log("Probar que el subject entregue el valor inicial a los nuevos subscriptores");
        const thunk = async () => "Hola";
        const subject = thunkSubjectMemo(thunk);

        let sub1;
        subject.subscribe(value => sub1 = value);
        await delay(0);
        expect(sub1).toEqual("Hola");

        let sub2;
        subject.subscribe(value => sub2 = value);
        await delay(0);
        expect(sub2).toEqual("Hola");
    }
    {
        console.log("Probar que testThunk sólo sea llamado cuando existan subscriptores vigentes");
        const subject = thunkSubjectMemo(testThunk);
        //Antes de llamar al testThunk no se ha aumentado el counter
        expect(llamadas).toBe(0);
        //Si llamamos al refresh no se llama al testThunk, ya que no hay ningun subscriptor
        subject.invalidate();
        expect(llamadas).toBe(0);

        //La primera llamada
        {
            let subs: rx.Subscription = null as any;

            //Inicialmente no hay llamadas
            expect(llamadas).toBe(0);

            const counter = await new Promise<number>(resolve => subs = subject.subscribe(resolve));
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
        let subA = 0;
        let subB = 0;

        const subscriptionA = subject.subscribe(x => subA = x);
        const subscriptionB = subject.subscribe(x => subB = x);

        //Inicialmente ya tienen el valor:
        expect(subA).toBe(1);
        expect(subB).toBe(1);
        expect(counter).toBe(llamadas);

        //nos esperamos a que se termine de ejecutar la funcion
        await delay(150);

        //Obtienen el valor anterior, que es la promesa con el 1:
        expect(subA).toBe(1);
        expect(subB).toBe(1);
        expect(counter).toBe(llamadas);

        //actualizamos el valor del subject con un valor que no es una promesa
        await subject.invalidate();
        expect(counter).toBe(llamadas);

        expect(subA).toBe(2);
        expect(subB).toBe(2);

        //actualizamos el valor del subject con uno que es una promesa:
        subject.invalidate();

        await delay(150);

        expect(subA).toBe(3);
        expect(subB).toBe(3);
        expect(counter).toBe(llamadas);

        //Eliminamos la subscriptionB
        subscriptionB.unsubscribe();

        //Actualizamos el valor de subject, sólo debe de actualizar subA
        await subject.invalidate();
        expect(counter).toBe(llamadas);

        expect(subA).toBe(4);
        expect(subB).toBe(3);
        expect(counter).toBe(llamadas);

        //Eliminamos la subscripcionA
        subscriptionA.unsubscribe();
        expect(counter).toBe(llamadas);

        //Agregamos de nuevo la subscripcionA
        let subC = 0;
        const subscriptionC = subject.subscribe(x => subC = x);

        //Debe de agarrar el valor anterior:
        expect(subC).toBe(4);
        expect(counter).toBe(llamadas);

        //Invalidamos el valor
        await subject.invalidate();

        expect(counter).toBe(llamadas);

        //Se regeneró el valor
        expect(subC).toBe(5);
        expect(counter).toBe(llamadas);

        //Si quitamos la subscriocion no regenera el valor:
        subscriptionC.unsubscribe();

        expect(llamadas).toBe(5);
        await subject.invalidate();
        //No realiza ninguna llamada ya que no hay subscriptores:
        expect(llamadas).toBe(5);

        //Agregamos un subscriptor, el cual va a generar una llamada ya que se marco como invalido el valor
        let subD = 0;
        const subscriptionD = subject.subscribe(x => subD = x);

        //Probemos el current, debe de tener la espera y el valor
        expect(await subject.current()).toBe(6);

        //Al tener el nuevo subscriptor recibimos la llamada
        expect(llamadas).toBe(6);
        expect(subD).toBe(6);

        subscriptionD.unsubscribe();

        //Realizamos el invalidado asincronom sin subscriptores, lo que ocasionará que no se realize la llamada hasta que se subcriba uno, pero el siguiente subscriptor tendra el valor tal cual, no la promesa sin resolver
        expect(llamadas).toBe(6);
        await subject.invalidate();
        //No realiza ninguna llamada ya que no hay subscriptores:
        expect(llamadas).toBe(6);

        let subF = 0;
        const subscriptionF = subject.subscribe(x => subF = x);

        //Al entrar el subscriptor realizó la llamada
        expect(llamadas).toBe(7);
        //Al subscriptor no se le dio el valor anterior, ya que el nuevo valor aún se esta calculando
        expect(subF).toBe(0);

        await delay(150);
        //La cantidad de llamadas es la misma, solo que el valor de la llamada anterior ya esta listo
        expect(llamadas).toBe(7);
        //Ahora si el subF tiene el valor mas reciente, y no es una promesa si no el valor tal cual
        expect(subF).toBe(7);
    }

    console.log("all tests passed");
})().then(x => {
}, x => {
    console.warn(x);
});