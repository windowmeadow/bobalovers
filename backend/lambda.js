// src/lambda.js
const serverlessExpress = require('@codegenie/serverless-express');
const app = require('./server'); // your existing Express app

exports.handler = serverlessExpress({ app });
