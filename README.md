# binary-protocol-example
A toy example of a custom binary protocol for exchanging structured data between a client and a server with Socket.io

## Installing and running the demo

You will need [npm](https://www.npmjs.com/) to install the Node.js packages required for the server. To run the server, you'll need to have Node.js installed.

Clone the repository. Inside the newly created directory, run `npm install` to install the Node.js packages listed in `package.json`. Then run `node server.js` to start the server. The server will listen to connections on port `8081`; you can change that behaviour by editing the code. You can access the app by navigating to http://localhost:8081/.

When you navigate to the client page, the server will react by encoding a Javascript object and sending it via Socket.io as an ArrayBuffer. The client will decode it and output the decoded content to the console. Feel free to modify the content of the object, but don't forget to update the schema accordingly or it won't work.

## Tour of the code

`server.js` containts the Javascript object that is sent to the client (called `update`). All the encoding/decoding methods, as well as the schema to use for these operations, are located in `js/codec.js`. The code should be relatively clear if you have read the tutorial, but if not, let me know. 


