# React Example (React v15)

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Installation

```
lerna bootstrap
```

### `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br>
You will also see any lint errors in the console.

### Installation of local react-sdk

Unfortunately lerna does not correctly symlink with create-react-app.  For you to use the local `react-sdk` you must run the following

```
cd node_modules/@optimizely
rm -rf react-sdk
cp -r ../../../react-sdk .
```