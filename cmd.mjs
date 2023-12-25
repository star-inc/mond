import "./src/config/load.mjs";

import got from 'got';

import {
  writeFileSync
} from "node:fs";

import {
  useConfig
} from './src/config/index.mjs';

const {
  entrypoint
} = useConfig();

const {
  host_http: inabaHost,
  token: inabaToken,
} = entrypoint;

const client = got.extend({
  prefixUrl: inabaHost,
  headers: {
    "x-inaba-token": inabaToken,
  }
});

const [method, url, output] = process.argv.slice(2);

client(url, { method }).
  json().
  then((result) => {
    console.info(result);
    if (output) {
      writeFileSync(output, JSON.stringify(result));
    }
  }).
  catch((error) => {
    if (error.response) {
      console.error(error.response.body);
    } else {
      console.error(error.message);
    }
  });
