# rx-thunk-subject
An rx subject from an async thunk.
- The thunk is not executed until the first subscription is done
- The value can be invalidated thus refreshing existing subscribers values
- Useful for managing changing values from the server
- Subscribers only need to manage sync values

## Create a `ThunkSubject` from an async thunk
```js
async function query() : Promise<Data> {
    return fetch("/api/myquery");
}

//The query function will not be executed until the first subscribe call
const data = new ThunkSubject(query);
```

## Subscribe to your data
```js
function handleData(value: Data) {
    //handle your data.
}

//The query function is called, handleData gets the query promise
data.subscribe(handleData)

...
//Other handler receives the last thunk value, the query function is not called
data.subscribe(otherHandler);
```

## Refresh your data
```js
//The query function is called if there are any subscribers, all subscribers get the new value
//If there isn't any subscribers, the function is called on the next subscription
data.invalidate();
```