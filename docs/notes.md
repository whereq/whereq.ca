# Google Map

## API DOC
[API Doc](https://developers.google.com/maps/documentation/javascript)


## Double click event of AdvancedMarkerElement
```typescript
  // google.maps.marker.AdvancedMarkerElement doesn't support dblclick event
  /*
  marker.addListener("dblclick", () => {
    event.stop();
    logUtil.log("AdvancedMarkerElement double-clicked");
    eventEmitter.emit("marker-dblclick");
    onDoubleClick(); // Call the onDoubleClick callback
  });
  */
```

## google.maps.Marker and markercomplete event
The `markercomplete` event in the Google Maps JavaScript API v3 still uses `google.maps.Marker`. 

**Key Points:**

* **`markercomplete` Event:** This event is specifically associated with the `DrawingManager` object. When a user finishes drawing a marker using the DrawingManager, this event fires.
* **Event Argument:** The `markercomplete` event handler receives a single argument, which is an instance of `google.maps.Marker`. This represents the newly created marker.

**No Direct Newer Version:**

There isn't a separate event or object specifically designed to replace `google.maps.Marker` in the context of the `markercomplete` event.

**Example:**

```javascript
google.maps.event.addListener(drawingManager, 'markercomplete', function(marker) {
  // marker is an instance of google.maps.Marker
  // You can access marker properties and add listeners to it here
  logUtil.log(marker.getPosition()); 
  marker.addListener('click', function() {
    // Handle marker click events
  });
});
```

**In Summary:**

While the Google Maps JavaScript API continues to evolve, the `markercomplete` event and its use of `google.maps.Marker` remain valid and functional within the current API version.


## Customize Google Map Marker

```typescript
// const beachFlagImg = document.createElement('img');
// beachFlagImg.src = 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png';

// const parser = new DOMParser();

// A marker with a custom inline SVG.
// const pinSvgString = '<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56" fill="none"><rect width="56" height="56" rx="28" fill="#7837FF"></rect><path d="M46.0675 22.1319L44.0601 22.7843" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M11.9402 33.2201L9.93262 33.8723" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M27.9999 47.0046V44.8933" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M27.9999 9V11.1113" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M39.1583 43.3597L37.9186 41.6532" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M16.8419 12.6442L18.0816 14.3506" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M9.93262 22.1319L11.9402 22.7843" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M46.0676 33.8724L44.0601 33.2201" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M39.1583 12.6442L37.9186 14.3506" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M16.8419 43.3597L18.0816 41.6532" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"></path><path d="M28 39L26.8725 37.9904C24.9292 36.226 23.325 34.7026 22.06 33.4202C20.795 32.1378 19.7867 30.9918 19.035 29.9823C18.2833 28.9727 17.7562 28.0587 17.4537 27.2401C17.1512 26.4216 17 25.5939 17 24.7572C17 23.1201 17.5546 21.7513 18.6638 20.6508C19.7729 19.5502 21.1433 19 22.775 19C23.82 19 24.7871 19.2456 25.6762 19.7367C26.5654 20.2278 27.34 20.9372 28 21.8649C28.77 20.8827 29.5858 20.1596 30.4475 19.6958C31.3092 19.2319 32.235 19 33.225 19C34.8567 19 36.2271 19.5502 37.3362 20.6508C38.4454 21.7513 39 23.1201 39 24.7572C39 25.5939 38.8488 26.4216 38.5463 27.2401C38.2438 28.0587 37.7167 28.9727 36.965 29.9823C36.2133 30.9918 35.205 32.1378 33.94 33.4202C32.675 34.7026 31.0708 36.226 29.1275 37.9904L28 39Z" fill="#FF7878"></path></svg>';

// const pinSvgString = '<svg width="50" height="30" viewBox="0 0 50 30"><rect x="5" y="5" width="40" height="20" rx="3" ry="3" fill="#ccc" /><text x="25" y="17" text-anchor="middle" font-size="12">1.5M</text><polygon points="25 20, 22 25, 28 25" fill="#000" /></svg>';

// const pinSvg =
// parser.parseFromString(pinSvgString, 'image/svg+xml').documentElement;
```
